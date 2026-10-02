# Moodify
// deployed project link
https://moodify-9dbp.onrender.com/
**Your face. Your mood. Your music.** Moodify is a dark, expressive music discovery app that estimates visible facial expressions in your browser and pairs them with a mood-based demo catalog. An expression is only an estimate; it is not a diagnosis or a reliable measure of someone's inner emotional state.

## Features

- Seven configurable expression-to-music mood mappings and a four-mood demo cycle.
- Optional browser camera access with face-api.js expression estimates. The browser library and models load only when scanning starts. Video stays in the browser; the stream stops when the detector page closes.
- Demo music player with play/pause, previous/next, volume, moods, favorites, playlists, listening history, and a searchable catalog including 35 Hindi and 30 Haryanvi tracks.
- Responsive dashboard, discovery, favorites, playlists, history, detector and preferences pages.
- Local browser persistence for favorites, playlists and history. Mood history can be disabled in Settings.
- Express REST API with MongoDB models, password hashing, JWT auth, validation and protected user routes.

## Stack

React, TypeScript, Vite, React Router, Tailwind CSS, Framer Motion, Lucide, face-api.js, Node.js, Express, MongoDB/Mongoose.

## Run locally

1. Install Node.js 20 or newer.
2. Install the locked dependencies: `npm ci`
3. Start the frontend: `npm run dev`
4. Open the printed Vite URL. Camera use requires `localhost` or HTTPS and browser permission.
5. Start the API in a second terminal after configuring `.env` from `.env.example`: `npm run server`

The demo works without signing in. Camera analysis loads the existing face-api.js browser bundle and models on demand from public CDNs. If either resource is unavailable, use Demo Mode or manual mood selection. Camera frames are never sent to the API. The Mood Detector searches YouTube once when its mood changes (or when Refresh songs is pressed), shows matching video cards, and plays a selected result in the official YouTube embedded player. A mood update never replaces the selected video automatically.

## Environment

Copy `.env.example` to `.env` in the project root and set `YOUTUBE_API_KEY` to a YouTube Data API v3 key from your Google Cloud project. Keep this key in the backend `.env` only; never prefix it with `VITE_` or put it in frontend source. Also set `MONGODB_URI`, a long random `JWT_SECRET`, and optionally `PORT`, `CLIENT_ORIGIN`, and `VITE_API_URL`. Enable YouTube Data API v3 for the Google Cloud project attached to that key. Never commit `.env`. Without a key, the UI shows a clear setup message instead of failing silently. The email sign-in and registration screen calls the REST auth endpoints; Demo Mode stores a local demo profile without contacting the server. Google sign-in displays an honest not-configured message until an OAuth provider is connected. Favorites, playlists, and history remain in this browser's local storage in demo mode.

## API

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/user/profile`
- `GET /api/songs`, `GET /api/songs/:id`, `GET /api/recommendations/:mood`
- `GET /api/favorites`, `POST /api/favorites/:songId`, `DELETE /api/favorites/:songId`
- `GET /api/playlists`, `POST /api/playlists`, `PUT /api/playlists/:id`, `DELETE /api/playlists/:id`
- `GET /api/history`, `DELETE /api/history`
- `GET /api/youtube/search?q=<search-query>` (YouTube Data API proxy; key stays server-side, results cached for five minutes)
- `GET /api/health`

Protected endpoints require `Authorization: Bearer <token>`. Server-side history is returned only when the account has opted into mood history.

## Music and model notes

The catalog is demo metadata with replaceable audio preview URLs. The SoundHelix samples are generic demo audio and do not match the displayed song metadata; replace `src/data/songs.ts` with a licensed provider catalog before presenting it as a production music service. Cover art uses Unsplash URLs. The face-api.js models are client-loaded from its public model host; self-host the model files and pin/version them for production reliability.

## Deployment

The repository includes a Render Blueprint in `render.yaml` for a single Node web service. It runs `npm ci && npm run build`, then `npm start`; the Express server serves both the API and Vite's `dist/` app, including direct SPA routes such as `/mood-detector`. Connect this repository in Render as a Blueprint to create the service. Set `YOUTUBE_API_KEY` in the service environment to enable in-app mood recommendations. Configure `MONGODB_URI` to enable persistent email accounts; without MongoDB, use the browser's demo mode. The Blueprint generates a `JWT_SECRET`. HTTPS enables camera permission.

## Next steps

Persist playlist/favorite/history updates through the REST service, self-host versioned face-api models, and add automated accessibility and browser integration checks. YouTube search requires a valid server-side API key and is subject to Google quota and video embed restrictions.
