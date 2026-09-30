import type { Mood } from './moods';
import regionalSongs from './regionalSongs';
export type Song = { id: number; title: string; artist: string; album: string; mood: Mood; genre: string; duration: string; cover: string; audio: string; language?: 'Hindi' | 'Haryanvi' | 'International' };
const titles: Record<Mood, [string,string][]> = {
 Happy: [['Golden Hour','JVKE'],['Sunday Best','Surfaces'],['Good Days','SZA'],['Electric Love','BØRNS'],['Sunroof','Nicky Youre'],['Levitating','Dua Lipa'],['Lovely Day','Bill Withers']], Sad: [['Anchor','Novo Amor'],['Moon Song','Phoebe Bridgers'],['Cherry Wine','Hozier'],['The Night We Met','Lord Huron'],['I Found','Amber Run'],['Roslyn','Bon Iver'],['Saturn','Sleeping At Last']], Angry: [['Do I Wanna Know?','Arctic Monkeys'],['Figure It Out','Royal Blood'],['Heads Will Roll','Yeah Yeah Yeahs'],['My Number','Foals'],['Seven Nation Army','The White Stripes'],['Uprising','Muse'],['Believer','Imagine Dragons']], Neutral: [['Weightless','Marconi Union'],['Coffee Breath','Sofia Mills'],['A Walk','Tycho'],['Sunset Lover','Petit Biscuit'],['Tadow','Masego'],['Warm on a Cold Night','HONNE'],['Luv(sic) pt3','Nujabes']], Surprised: [['Walking on a Dream','Empire of the Sun'],['Tongue Tied','Grouplove'],['Young Folks','Peter Bjorn'],['Sweet Disposition','The Temper Trap'],['1901','Phoenix'],['Dog Days Are Over','Florence + The Machine']], Fearful: [['Bloom','The Paper Kites'],['Near Light','Ólafur Arnalds'],['Experience','Ludovico Einaudi'],['Open','Rhye'],['First Breath After Coma','Explosions in the Sky'],['Awake','Tycho']], Disgusted: [['Keep Your Head Up','Ben Howard'],['Three Little Birds','Bob Marley'],['Put Your Records On','Corinne Bailey Rae'],['Dog Days Are Over','Florence + The Machine'],['Brighter Than the Sun','Colbie Caillat'],['Here Comes the Sun','The Beatles']]
};
let index = 0;
export const songs: Song[] = (Object.keys(titles) as Mood[]).flatMap(mood => titles[mood].map(([title,artist]) => {const id=++index;return {id,title,artist,album:`${title} — Single`,mood,genre:mood==='Happy'?'Pop':mood==='Sad'?'Acoustic':mood==='Angry'?'Alternative rock':mood==='Neutral'?'Lo-fi':mood==='Fearful'?'Ambient':'Indie',duration:`${3+id%3}:${String(12+id*7%48).padStart(2,'0')}`,cover:`https://images.unsplash.com/photo-${['1519608487953-e999c86e7455','1470225620780-dba8ba36b745','1493225457124-a3eb161ffa5f','1516280440614-37939bbacd81','1500530855697-b586d89ba3ee','1500534623283-312aade485b7','1470770841072-f978cf4d019e','1493246507139-91e8fad9978e'][id%8]}?auto=format&fit=crop&w=480&q=80`,audio:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(id%16)+1}.mp3`};}));

const regionalCoverIds = ['1519608487953-e999c86e7455','1470225620780-dba8ba36b745','1493225457124-a3eb161ffa5f','1516280440614-37939bbacd81','1500530855697-b586d89ba3ee','1500534623283-312aade485b7','1470770841072-f978cf4d019e','1493246507139-91e8fad9978e'];
songs.push(...regionalSongs.map((track, offset) => {
  const id = songs.length + offset + 1;
  return {
    ...track,
    id,
    album: `${track.title} — Single`,
    duration: `${3 + id % 3}:${String(12 + id * 7 % 48).padStart(2, '0')}`,
    cover: `https://images.unsplash.com/photo-${regionalCoverIds[id % regionalCoverIds.length]}?auto=format&fit=crop&w=480&q=80`,
    audio: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(id % 16) + 1}.mp3`,
  };
}));
