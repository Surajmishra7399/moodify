import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Play, RefreshCw, Youtube } from 'lucide-react';
import type { Mood } from '../data/moods';

type Video = { videoId: string; title: string; thumbnail: string; channelTitle: string; description: string };
type SearchResult = { items: Video[] };
type YouTubePlayer = { playVideo: () => void; pauseVideo: () => void; destroy: () => void };
type YouTubeApi = { Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, number>; events: { onReady: () => void; onError: (event: { data: number }) => void; onStateChange: (event: { data: number }) => void } }) => YouTubePlayer };
declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void } }
const queries: Record<Mood, string> = {
  Happy: 'happy Hindi songs', Sad: 'emotional Hindi songs', Angry: 'energetic Hindi songs',
  Fearful: 'calm relaxing songs', Disgusted: 'chill Hindi songs', Surprised: 'energetic popular songs', Neutral: 'popular Hindi songs',
};
const apiBase = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api')).replace(/\/$/, '');
const pending = new Map<string, Promise<SearchResult>>();
const resultsCache = new Map<string, SearchResult>();
let playerApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubePlayerApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (playerApiPromise) return playerApiPromise;
  playerApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT?.Player) resolve(window.YT); else { playerApiPromise = null; reject(new Error('YouTube player could not initialize.')); } };
    script.onerror = () => { playerApiPromise = null; script.remove(); reject(new Error('Could not load the YouTube player. Check your connection and try again.')); };
    document.head.appendChild(script);
  });
  return playerApiPromise;
}

async function searchYouTube(query: string, refresh = false): Promise<SearchResult> {
  const key = query.toLowerCase();
  if (!refresh && resultsCache.has(key)) return resultsCache.get(key)!;
  if (!refresh && pending.has(key)) return pending.get(key)!;
  const request = fetch(`${apiBase}/youtube/search?q=${encodeURIComponent(query)}`)
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load songs. Please try again.');
      if (!Array.isArray(data.items)) throw new Error('The song search returned an invalid response.');
      return data as SearchResult;
    })
    .then(data => { resultsCache.set(key, data); return data; })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export default function MusicRecommendations({ mood }: { mood: Mood }) {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Video | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const playerHost = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const requestId = useRef(0);
  const lastMood = useRef<Mood | null>(null);
  const activeQuery = queries[mood];
  const missingKey = error.includes('YOUTUBE_API_KEY') || error.toLowerCase().includes('not configured');

  const load = useCallback(async (refresh = false) => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await searchYouTube(activeQuery, refresh);
      if (requestId.current !== id) return;
      setItems(data.items);
    } catch (err) {
      if (requestId.current !== id) return;
      setItems([]);
      setError(err instanceof Error ? err.message : 'Unable to load songs. Please try again.');
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [activeQuery]);

  useEffect(() => {
    if (lastMood.current === mood) return;
    lastMood.current = mood;
    void load();
  }, [mood, load]);

  useEffect(() => {
    if (!selected) return;
    let disposed = false;
    setPlayerLoading(true);
    setPlayerError('');
    loadYouTubePlayerApi().then(api => {
      if (disposed || !playerHost.current) return;
      player.current = new api.Player(playerHost.current, {
        videoId: selected.videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => setPlayerLoading(false),
          onError: event => { setPlayerLoading(false); setIsPlaying(false); setPlayerError(event.data === 101 || event.data === 150 ? 'This video does not allow embedded playback.' : 'YouTube could not play this video. Select another song and try again.'); },
          onStateChange: event => setIsPlaying(event.data === 1),
        },
      });
    }).catch(err => { if (!disposed) { setPlayerLoading(false); setPlayerError(err instanceof Error ? err.message : 'Could not load the YouTube player.'); } });
    return () => { disposed = true; player.current?.destroy(); player.current = null; setIsPlaying(false); };
  }, [selected?.videoId]);

  const play = (video: Video) => {
    setSelected(video);
    setPlayerError('');
    setPlayerLoading(true);
  };
  const move = (direction: -1 | 1) => {
    if (!selected || items.length < 2) return;
    const current = items.findIndex(item => item.videoId === selected.videoId);
    const next = (current + direction + items.length) % items.length;
    play(items[next]);
  };

  return <section className="youtube-recommendations" aria-label="YouTube music recommendations">
    <div className="youtube-heading">
      <div><span className="eyebrow"><Youtube size={14}/> MOOD MATCH · YOUTUBE</span><h2>Recommended for <em>{mood.toLowerCase()}</em></h2><p>Searches YouTube when your detected or selected mood changes.</p></div>
      <button className="outline-btn youtube-refresh" onClick={() => void load(true)} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''}/>{loading ? 'Searching…' : 'Refresh songs'}</button>
    </div>
    {loading && <div className="youtube-status"><LoaderCircle className="spin" size={18}/> Finding songs for this mood…</div>}
    {!loading && error && <div className={`youtube-status ${missingKey?'youtube-setup-needed':'youtube-error'}`} role="status"><div className="youtube-error-copy"><span>{error}</span>{missingKey&&<small>To enable in-app results, copy <code>.env.example</code> to <code>.env</code> in the project root, set <code>YOUTUBE_API_KEY</code>, then restart <code>npm run server</code>.</small>}</div><div className="youtube-error-actions">{missingKey&&<a className="outline-btn" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeQuery)}`} target="_blank" rel="noreferrer">Search YouTube <ExternalLink size={13}/></a>}<button className="outline-btn" onClick={() => void load(true)}>Try again</button></div></div>}
    {!loading && !error && items.length === 0 && <div className="youtube-status">No songs found for this mood. Try refreshing or choose another mood.</div>}
    {items.length > 0 && <div className="youtube-song-grid">{items.map(video => <article className={`youtube-song-card ${selected?.videoId === video.videoId ? 'selected' : ''}`} key={video.videoId}>
      <button className="youtube-song-select" onClick={() => play(video)} aria-label={`Play ${video.title}`}>
        <span className="youtube-thumb"><img src={video.thumbnail} alt="" loading="lazy"/><i><Play size={17} fill="currentColor"/></i></span>
        <span className="youtube-song-meta"><b title={video.title}>{video.title}</b><small>{video.channelTitle}</small></span>
      </button>
      <a className="youtube-open" href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} on YouTube`}><ExternalLink size={13}/></a>
    </article>)}</div>}
    {selected && <div className="youtube-player-panel">
      <div className="youtube-player-top"><div><span className="eyebrow">NOW PLAYING · YOUTUBE</span><b>{selected.title}</b><small>{selected.channelTitle}</small></div><div className="youtube-player-nav"><button className="outline-btn" onClick={() => move(-1)} disabled={items.length < 2} aria-label="Previous song"><ChevronLeft size={16}/> Previous</button><button className="outline-btn" onClick={() => isPlaying ? player.current?.pauseVideo() : player.current?.playVideo()} disabled={playerLoading || Boolean(playerError)} aria-label={isPlaying ? 'Pause song' : 'Play song'}>{isPlaying ? 'Pause' : 'Play'}</button><button className="outline-btn" onClick={() => move(1)} disabled={items.length < 2} aria-label="Next song">Next <ChevronRight size={16}/></button></div></div>
      {playerError ? <div className="youtube-status youtube-error" role="alert">{playerError} Pick another song or open it on YouTube.</div> : <div className="youtube-iframe-wrap">
        {playerLoading && <div className="youtube-player-loading"><LoaderCircle size={20} className="spin"/> Loading YouTube player…</div>}
        <div ref={playerHost} className="youtube-player-host" aria-label={`YouTube player: ${selected.title}`}/>
      </div>}
      <small className="youtube-note">Playback uses YouTube’s embedded player. Video availability and playback are controlled by YouTube.</small>
    </div>}
  </section>;
}
