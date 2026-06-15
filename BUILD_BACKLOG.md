# LaunchReel build backlog

Agent-driven loop: run `npm run loop:tick` or read this file each cycle.
Pick the **first unchecked** task in the highest priority section that still applies.
After completing a task: mark `[x]`, run `npm run verify`, update this file if scope changed.

## P0 — Core product (active)

- [x] Client-first pipeline: intake → audit → moments → generate → result
- [x] Shot-list compositor + Ken-Burns screenshots + social clips
- [x] ZIP export + brand kit + share page fallbacks
- [x] API helpers + storage quota errors
- [x] `deleteProject` in store + IndexedDB cleanup + dashboard delete action
- [x] Apply `api-helpers` to judge, captions, rewrite, localize, transcribe, tts
- [x] Record screen deep-link from `/new` → `/record` with return URL
- [x] Product Hunt draft intake stub (paste launch URL → prefill copy fields)

## P1 — Polish

- [x] Library page: list projects with footage/render status badges
- [x] Result page: regenerate single asset (social only / copy only)
- [x] Agent capture: progress UI + retry on `/new`
- [x] Export narrations + separate audio track in ZIP
- [x] Voice chips on Copy tab wired to rewrite API

**P1 complete.** Next work is P2 (cloud / auth) when explicitly requested.

## P2 — Phase 10 (cloud — optional env vars)

- [x] Auth (Clerk) + Postgres project sync
- [x] Stripe credits + Trigger.dev render queue
- [x] Remotion Lambda / YouTube OAuth / PH OAuth

See `docs/PHASE10.md` for setup. Without env vars the app runs in local-only mode.

## P3 — Next up

- [x] Bidirectional cloud sync on sign-in (`POST /api/projects/sync`)
- [x] YouTube upload API stub (`POST /api/youtube/upload`)
- [x] Push rendered blobs to cloud storage (S3/R2)
- [x] Share page OG meta + social preview cards
- [x] Product Hunt OAuth publish flow (draft → live)

**P3 complete.** Add new `- [ ]` items below when expanding scope.

Each loop iteration should:
1. Read this file + `docs/BUILD_LOOP.md`
2. Implement **one** unchecked task (or fix verify if red)
3. Mark task done, run `npm run verify`
4. **Backlog complete (Jun 2025)** — ticks should verify green only unless you add new `- [ ]` items
