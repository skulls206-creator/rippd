# AGENTS.md — Shared context for AI agents working on RIPPD

This file is for AI coding agents (Replit Agent, Codex, Cursor, Claude Code, etc.)
collaborating on this repo. Keep it short, factual, and current. If you change
something an agent could reasonably get wrong, update this file.

For full workspace conventions (TS project refs, codegen, etc.) see `replit.md`.

---

## Product

**RIPPD** — dark-themed PWA. User pastes a YouTube / SoundCloud / Bandcamp /
Vimeo / Twitch / Dailymotion URL → backend uses `yt-dlp` to extract audio →
user downloads as MP3.

- Frontend: `artifacts/audio-downloader` (React + Vite, deployed to GitHub Pages)
- Backend: `artifacts/api-server` (Express, deployed on Replit Deployments)
- Canvas/mockup sandbox: `artifacts/mockup-sandbox` (design surface only — do not ship features here)

---

## Production URLs

| Surface | URL |
|---|---|
| Live site (GitHub Pages) | https://skulls206-creator.github.io/rippd/ |
| API server (Replit Deployment) | https://rippd.khurk.services |
| GitHub repo | https://github.com/skulls206-creator/rippd |

---

## Deploy pipeline (do not break)

**Frontend** — every push to `main` on GitHub runs `.github/workflows/deploy.yml`:
1. `pnpm install --frozen-lockfile`
2. Builds `artifacts/audio-downloader` with `BASE_PATH=/rippd/` and
   `VITE_API_BASE_URL` from GitHub repo variable `vars.VITE_API_BASE_URL`
   (currently `https://rippd.khurk.services`).
3. Uploads `artifacts/audio-downloader/dist/public` and deploys via
   `actions/deploy-pages@v4` (OIDC, no PAT needed at runtime).

**Backend** — Replit Deployment, redeploys when the user clicks Publish.

### Pushing from this environment

- Plain OAuth tokens **cannot** push changes that touch `.github/workflows/*`
  (GitHub rejects with "without `workflow` scope").
- A `GITHUB_PAT` secret (PAT with `repo` + `workflow`) is configured. Use it for
  pushes that include workflow changes:
  ```
  git push "https://skulls206-creator:${GITHUB_PAT}@github.com/skulls206-creator/rippd.git" main
  ```
- `git config` and `git remote add/remove` are **blocked** in the main agent
  sandbox. Embed credentials in the push URL instead of modifying `.git/config`.
- Do NOT print `$GITHUB_PAT` in command output — pipe through
  `sed "s/${GITHUB_PAT}/REDACTED/g"` if you need to log the push command.

---

## Frontend conventions

- All API calls must go through the base-URL helper, **not** raw `fetch("/api/...")`:
  - Generated React Query hooks: `setBaseUrl()` is called in `src/main.tsx`.
  - Manual fetches: import `apiUrl` from `src/lib/api-url.ts` and use
    `fetch(apiUrl("/api/..."))`. In dev this returns a relative URL; in the
    GitHub Pages build it prefixes the absolute API origin.
- `BASE_PATH` for routing/assets comes from Vite's `import.meta.env.BASE_URL`
  (already wired). Never hardcode `/rippd/`.
- PWA service worker is enabled (`vite-plugin-pwa`). After UI changes, verify
  the precache list still includes all critical assets.

---

## Backend conventions (api-server)

- Port: respects `PORT` env var (default 8080).
- CORS allow-list lives in `src/app.ts`. Override via env var
  `CORS_ALLOWED_ORIGINS` (comma-separated; entries wrapped in `/.../` are
  parsed as regex). Defaults include the GitHub Pages origin, `*.replit.dev`,
  and localhost (localhost only when `NODE_ENV !== "production"`).
- Rate limiting (`src/middlewares/rateLimit.ts`):
  - `RATE_LIMIT_WINDOW_MS` (default 60_000)
  - `RATE_LIMIT_MAX` (default 30 requests/window/IP)
  - `TRUST_PROXY` — unset by default; set to a hop count, `"true"`, or a
    subnet string only on deployments behind a known proxy. Don't blindly
    enable in tests or it'll break IP-based limiting.
- `yt-dlp` baseline args (`BASE_YTDLP_ARGS` in `src/routes/download.ts`):
  ```
  --js-runtimes node
  --remote-components ejs:github
  --sleep-requests 1
  --extractor-args youtube:player_client=android,ios
  ```
  The `youtube:player_client=android,ios` arg is the fix for YouTube 429s —
  do not remove without a replacement.
- `looksLikePlaylist()` returns `false` when a YouTube URL has a `v=` param,
  so playlist-context single-video URLs download as one track. Preserve this.

---

## Testing

- `pnpm test` from `artifacts/api-server` runs vitest + supertest integration
  tests, including the rate-limit suite in `src/__tests__/rateLimit.test.ts`.
  Tests `vi.resetModules()` and re-import `./app` because rate-limit config is
  read at import time. Follow the same pattern for any new env-driven middleware.
- After feature changes, prefer the `testing` skill (`runTest()`) over asking
  the user to click around.

---

## Common gotchas

1. **Don't bypass `apiUrl()` / `setBaseUrl()`** — relative `/api/...` calls
   work in dev but 404 on GitHub Pages.
2. **Workflow file edits need `GITHUB_PAT`** — see "Pushing" above.
3. **Don't enable `TRUST_PROXY` in tests** unless the test is specifically
   asserting forwarded-IP behavior; otherwise rate-limit tests get flaky.
4. **Mockup sandbox iframe URLs only for canvas previews** — never embed the
   main app dev server as a "component" iframe.
5. **`replit.md` is the source of truth** for monorepo / TS / codegen
   conventions. This file is the source of truth for product/deploy/runtime
   specifics. Keep them in sync, not duplicated.

---

## When you finish a task

- Run `pnpm run typecheck` from the repo root.
- If you touched the API, run `pnpm --filter @workspace/api-server test`.
- If your change should ship to users, push to `main` on GitHub
  (with `GITHUB_PAT` if any `.github/workflows/*` files changed). The Pages
  deploy is automatic; the API redeploys when the user clicks Publish.
