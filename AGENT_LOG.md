# AGENT_LOG — After-Action Reports

Append-only log so multiple AI agents (Replit Agent, Codex, Cursor, Claude Code,
etc.) can stay in sync. **Newest entry on top.** Read the top ~5 entries before
starting work so you don't duplicate or undo someone else's change.

## Entry format

```markdown
## YYYY-MM-DD HH:MM UTC — <agent name> — <one-line title>
- **Why**: 1–2 sentences. What the user asked for or what problem this solves.
- **What changed**: bullet list of files / behaviors touched.
- **Verified**: how you confirmed it works (typecheck, tests, manual, screenshot…).
- **Deployed**: yes / no — if yes, where (GitHub Pages, Replit Deployment).
- **Watch out**: anything the next agent could trip on. Omit if nothing.
```

Keep entries terse. If an entry needs more than ~10 lines, link to a commit or
a doc instead of inlining it.

---

## 2026-05-14 — Replit Agent — AGENTS.md + AGENT_LOG.md added
- **Why**: User asked for shared context + AARs between AI agents.
- **What changed**: New `AGENTS.md` (product/deploy/runtime cheatsheet) and
  `AGENT_LOG.md` (this file).
- **Verified**: N/A — docs only.
- **Deployed**: no — will ship on next push to `main`.
- **Watch out**: Both files are append-only conventions. Don't rewrite history
  in `AGENT_LOG.md`; add a new entry on top instead.
