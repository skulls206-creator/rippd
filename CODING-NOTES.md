# CODING-NOTES — rippd

## What This Project Is
RIPPD — mobile-friendly dark music PWA to download audio from YouTube, SoundCloud, Bandcamp & more.

## Tech Stack
- pnpm monorepo
- React + Vite + Tailwind v4 + PWA (vite-plugin-pwa)
- TypeScript (strict: false)
- Shared libs: db, api-client-react, api-zod, api-spec

## Structure
```
/
├── artifacts/
│   └── audio-downloader/ # Main app (React + Vite + PWA)
├── lib/
│   ├── db/
│   ├── api-client-react/
│   ├── api-zod/
│   └── api-spec/
└── package.json
```

## Build & Dev
- **Install:** `pnpm install`
- **Build:** `pnpm run build`
- **Typecheck:** `pnpm run typecheck`
- **Dev:** `cd artifacts/audio-downloader && pnpm run dev`

## Deploy
- GitHub Pages via `.github/workflows/deploy.yml`

## TypeScript
- Root: strict: false. Enable strict: true.
- Project references (tsc --build)

## Tests & Lint
- None configured

## Known Gotchas
- pnpm required
- Audio downloading from third-party sites may break when those sites change their APIs
- PWA service worker caching can cause stale UI during dev — disable cache or use incognito
- Cross-origin audio downloads may be blocked by CORS — API server handles proxying

## Previous Bugs / Regressions
*(Fill in as they happen)*
