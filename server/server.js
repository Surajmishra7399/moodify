import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app=express();
const projectRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const allowedOrigins=[...(process.env.CLIENT_ORIGIN||'http://localhost:5173,http://127.0.0.1:5173').split(','),process.env.RENDER_EXTERNAL_URL].map(value=>value?.trim()).filter(Boolean);
app.use(cors({origin(origin,callback){if(!origin||allowedOrigins.includes(origin))return callback(null,true);return callback(new Error('Origin not allowed'));}}));app.use(express.json({limit:'32kb'}));
const UserSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxLength:80},email:{type:String,required:true,unique:true,lowercase:true,trim:true},password:{type:String,required:true,select:false},favorites:[String],playlists:[{name:String,songs:[String],createdAt:{type:Date,default:Date.now}}],settings:{moodHistory:{type:Boolean,default:false},autoplay:{type:Boolean,default:true}},history:[{songId:String,detectedMood:String,playedAt:Date}]},{timestamps:true});
const User=mongoose.models.User||mongoose.model('User',UserSchema);
const catalog=[{id:'demo-1',title:'Golden Hour',artist:'JVKE',mood:'Happy',genre:'Pop'},{id:'demo-2',title:'Anchor',artist:'Novo Amor',mood:'Sad',genre:'Acoustic'},{id:'demo-3',title:'Figure It Out',artist:'Royal Blood',mood:'Angry',genre:'Alternative rock'},{id:'demo-4',title:'A Walk',artist:'Tycho',mood:'Neutral',genre:'Lo-fi'}];
const auth=(req,res,next)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');req.user=jwt.verify(token,process.env.JWT_SECRET).id;next();}catch{return res.status(401).json({error:'Authentication required'});}};
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
app.get('/api/health',(_req,res)=>res.json({status:'ok',database:mongoose.connection.readyState===1?'connected':'demo-mode'}));
const youtubeCache=new Map();
app.get('/api/youtube/search',asyncRoute(async(req,res)=>{
 const query=typeof req.query.q==='string'?req.query.q.trim().replace(/\s+/g,' '):'';
 if(!query||query.length>120)return res.status(400).json({error:'Enter a search query of up to 120 characters.'});
 const apiKey=process.env.YOUTUBE_API_KEY;
 if(!apiKey)return res.status(503).json({error:'YouTube search is not configured. Add YOUTUBE_API_KEY to the backend .env file.'});
 const cacheKey=query.toLowerCase(),cached=youtubeCache.get(cacheKey);
 if(cached&&cached.expires>Date.now())return res.json(cached.data);
 try{
  const url=new URL('https://www.googleapis.com/youtube/v3/search');
  url.search=new URLSearchParams({part:'snippet',type:'video',videoEmbeddable:'true',safeSearch:'moderate',maxResults:'12',q:query,key:apiKey}).toString();
  const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){const reason=payload?.error?.errors?.[0]?.reason;const quota=reason==='quotaExceeded'||reason==='dailyLimitExceeded';return res.status(quota?429:502).json({error:quota?'YouTube search limit reached for today. Please try again later.':'YouTube could not complete this search. Please try again.'});}
  const items=(payload.items||[]).flatMap(item=>{const videoId=item?.id?.videoId,snippet=item?.snippet;if(!videoId||!snippet)return[];return[{videoId,title:snippet.title||'Untitled video',thumbnail:snippet.thumbnails?.high?.url||snippet.thumbnails?.medium?.url||snippet.thumbnails?.default?.url||'',channelTitle:snippet.channelTitle||'YouTube',description:snippet.description||''}];});
  const data={items};youtubeCache.set(cacheKey,{data,expires:Date.now()+5*60*1000});if(youtubeCache.size>100)youtubeCache.delete(youtubeCache.keys().next().value);return res.json(data);
 }catch(error){console.error('YouTube search failed:',error?.message||error);return res.status(502).json({error:'Could not reach YouTube. Check the server connection and try again.'});}
}));
app.post('/api/auth/register',asyncRoute(async(req,res)=>{const {name,email,password}=req.body||{};if(typeof name!=='string'||name.trim().length<2||name.length>80||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8)return res.status(400).json({error:'Enter a valid name, email, and password of at least 8 characters.'});const exists=await User.findOne({email:email.toLowerCase()});if(exists)return res.status(409).json({error:'An account with this email already exists.'});const user=await User.create({name,email,password:await bcrypt.hash(password,12)});const token=jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:'7d'});res.status(201).json({token,user:{id:user.id,name:user.name,email:user.email}});}));
app.post('/api/auth/login',asyncRoute(async(req,res)=>{const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string')return res.status(400).json({error:'Email and password are required.'});const user=await User.findOne({email:email.toLowerCase()}).select('+password');if(!user||!await bcrypt.compare(password,user.password))return res.status(401).json({error:'Email or password is incorrect.'});const token=jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:'7d'});res.json({token,user:{id:user.id,name:user.name,email:user.email}});}));
app.get('/api/user/profile',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user).select('-password');if(!user)return res.status(404).json({error:'User not found'});res.json(user);}));
app.get('/api/songs',(_req,res)=>res.json(catalog));app.get('/api/songs/:id',(req,res)=>{const song=catalog.find(s=>s.id===req.params.id);return song?res.json(song):res.status(404).json({error:'Song not found'});});
app.get('/api/recommendations/:mood',(req,res)=>{const found=catalog.filter(s=>s.mood.toLowerCase()===req.params.mood.toLowerCase());res.json(found.length?found:catalog);});
app.get('/api/favorites',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);res.json(user?.favorites||[]);}));
app.post('/api/favorites/:songId',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);if(!user)return res.status(404).json({error:'User not found'});if(!user.favorites.includes(req.params.songId))user.favorites.push(req.params.songId);await user.save();res.json(user.favorites);}));
app.delete('/api/favorites/:songId',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);if(!user)return res.status(404).json({error:'User not found'});user.favorites=user.favorites.filter(id=>id!==req.params.songId);await user.save();res.json(user.favorites);}));
app.get('/api/playlists',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);res.json(user?.playlists||[]);}));
app.post('/api/playlists',auth,asyncRoute(async(req,res)=>{const name=typeof req.body?.name==='string'?req.body.name.trim():'';if(!name||name.length>80)return res.status(400).json({error:'Playlist name must be 1–80 characters.'});const user=await User.findById(req.user);if(!user)return res.status(404).json({error:'User not found'});user.playlists.push({name,songs:[]});await user.save();res.status(201).json(user.playlists.at(-1));}));
app.put('/api/playlists/:id',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);const list=user?.playlists.id(req.params.id);if(!list)return res.status(404).json({error:'Playlist not found'});if(typeof req.body?.name==='string')list.name=req.body.name.trim().slice(0,80);if(Array.isArray(req.body?.songs)&&req.body.songs.every(x=>typeof x==='string'))list.songs=req.body.songs;await user.save();res.json(list);}));
app.delete('/api/playlists/:id',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);if(!user)return res.status(404).json({error:'User not found'});user.playlists.pull(req.params.id);await user.save();res.status(204).end();}));
app.get('/api/history',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);res.json(user?.settings?.moodHistory?user.history:[]);}));
app.delete('/api/history',auth,asyncRoute(async(req,res)=>{const user=await User.findById(req.user);if(user){user.history=[];await user.save();}res.status(204).end();}));
// In production, serve the Vite build from this same service so API and SPA
// routes share one origin and direct links such as /mood-detector keep working.
const clientBuild=path.join(projectRoot,'dist');
app.use(express.static(clientBuild));
app.get('*',(req,res,next)=>{
 if(req.path.startsWith('/api/'))return next();
 return res.sendFile(path.join(clientBuild,'index.html'),error=>{if(error)next();});
});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Something went wrong. Please try again.'});});
const port=process.env.PORT||4000;
if(process.env.MONGODB_URI&&process.env.JWT_SECRET){mongoose.connect(process.env.MONGODB_URI).then(()=>app.listen(port,()=>console.log(`Moodify API listening on ${port}`))).catch(error=>{console.error('Database connection failed:',error.message);process.exit(1);});}else{console.warn('MongoDB or JWT_SECRET not configured; start the API with .env values.');app.listen(port,()=>console.log(`Moodify API listening on ${port}`));}
