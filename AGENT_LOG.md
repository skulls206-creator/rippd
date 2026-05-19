# AGENT_LOG — Sync Log & After-Action Reports

**This is the cross-agent sync file.** Append-only log so multiple AI agents
(Replit Agent, Codex, Cursor, Claude Code, opencode, etc.) can stay in sync.
**Newest entry on top.**

## Workflow

1. **Before starting work** — Read the top ~5 entries so you don't duplicate
   or undo someone else's change.
2. **After finishing work** — Append a new entry on top documenting what
   changed, why, what's pending, and anything the next agent needs to know.
3. **Never rewrite history** — Add new entries only.

## Entry format

```markdown
## YYYY-MM-DD HH:MM UTC — <agent name> — <one-line title>
- **Why**: 1–2 sentences. What the user asked for or what problem this solves.
- **What changed**: bullet list of files / behaviors touched.
- **Verified**: how you confirmed it works (typecheck, tests, manual, screenshot…).
- **Deployed**: yes / no — if yes, where (GitHub Pages, Replit Deployment).
- **Pending / Open questions**: [ ] items the next agent should look at or
  decide. Omit if nothing.
- **Watch out**: anything the next agent could trip on. Omit if nothing.
```

Keep entries terse. If an entry needs more than ~10 lines, link to a commit or
a doc instead of inlining it.

---

## 2026-05-15 22:46 UTC — Satoshi (opencode) — Onboarded & set AGENT_LOG.md as dual sync/AAR file
- **Why**: Skulls asked me to read all .md files in rippd, understand them, and
  ensure a sync/handoff mechanism exists so AI agents stay coordinated.
- **What changed**:
  - Read and understood `AGENTS.md`, `AGENT_LOG.md`, `replit.md`, and
    `attached_assets/content-1774634687123.md` (yt-dlp README, not relevant).
  - Updated `AGENT_LOG.md` header: renamed to "Sync Log & After-Action Reports",
    added workflow instructions, added **Pending / Open questions** field to the
    entry format for handoff coordination.
  - No application code touched.
- **Verified**: N/A — docs only.
- **Deployed**: no
- **Pending / Open questions**:
  - [ ] This file is now the sync file for all agents (Replit Agent, opencode,
    Cursor, Codex, etc.). Other AI builder: please use the updated entry format
    with `Pending / Open questions` when you add entries.
  - [ ] Repo is cloned locally at `/root/.openclaw/workspace/rippd/` in the
    opencode environment. If you push changes that need pulling on that side,
    ping Satoshi.
- **Watch out**: The `attached_assets/` folder has a yt-dlp README that was
  auto-fetched — not repo-relevant. AGENTS.md and replit.md are the real
  source-of-truth docs. Don't touch `artifacts/mockup-sandbox` for shipping
  features. Use `GITHUB_PAT` for pushes touching `.github/workflows/*`.

## 2026-05-14 21:40 UTC — opencode — Fix 8 issues: theme double-apply, fragile Arctic CSS, missing destructive/glass vars, private IP regex, blob URL cleanup, docs drift
- **Why**: User requested review then fix of all 8 issues found during codebase review.
- **What changed**:
  - `useTheme.ts`: removed duplicate `useEffect` that applied theme twice on mount
  - `themes.ts`: added `--destructive`, `--destructive-foreground`, and glass overlay CSS vars (`--glass-bg*`, `--glass-border*`, `--glass-text*`) to all 6 themes
  - `index.css`: added glass vars to `:root`, `@theme` entries for Tailwind (`bg-glass-*`), replaced Arctic `!important` class overrides with CSS var overrides on `html[data-theme="arctic"]`
  - `Home.tsx`, `SearchBar.tsx`, `Header.tsx`, `PlaylistView.tsx`, `SpotifyHistory.tsx`, `not-found.tsx`, `PremiumButton.tsx`: replaced hardcoded `text-white/70` / `bg-white/5` / `border-white/10` Tailwind classes with `text-glass-text` / `bg-glass-bg` / `border-glass-border` etc.
  - `download.ts`: tightened `172.x.x.x` private IP check to RFC 1918 `172.16-31.x.x` range via regex
  - `SpotifyHistory.tsx`, `PlaylistView.tsx`, `Home.tsx`: reduced blob URL revocation timeout from 5s to 500ms
  - `replit.md`: fixed outdated "AUDIORIP" brand → "RIPPD"; added glass CSS var conventions
- **Verified**: `tsc --build` passes, `pnpm -r typecheck` passes on all 4 artifact packages, private IP regex tested with PowerShell
- **Deployed**: no
- **Watch out**: Custom domain `rippd.khurk.xyz` now uses `BASE_PATH=/` in deploy workflow. If the original GH Pages URL (`skulls206-creator.github.io/rippd/`) is ever used directly without the redirect, it'll break because assets are at root-relative paths. Also, new components should use `bg-glass-bg` / `border-glass-border` / `text-glass-text` instead of hardcoded `bg-white/5` / `border-white/10` / `text-white/70`. The Arctic theme is now driven purely by CSS var overrides — no `!important` hacks. If adding a new opacity variant not covered by existing vars, add it to `:root`, each theme in `themes.ts`, and `@theme` in `index.css`.

## 2026-05-14 — Replit Agent — AGENTS.md + AGENT_LOG.md added
- **Why**: User asked for shared context + AARs between AI agents.
- **What changed**: New `AGENTS.md` (product/deploy/runtime cheatsheet) and
  `AGENT_LOG.md` (this file).
- **Verified**: N/A — docs only.
- **Deployed**: no — will ship on next push to `main`.
- **Watch out**: Both files are append-only conventions. Don't rewrite history
  in `AGENT_LOG.md`; add a new entry on top instead.
