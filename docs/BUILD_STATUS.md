# LaunchReel — consolidated build status

Last verified: **P0–P5 complete** (`npm run verify` green).

LaunchReel is a **client-first** Next.js app: project metadata in localStorage, media blobs in IndexedDB. Cloud features (Clerk, Postgres, Stripe, S3/R2, OAuth) are optional and degrade gracefully when env vars are unset.

---

## User flow

```
/new or /record → audit → angle → moments → generate kit → result → share
```

| Step | Route | What happens |
|------|-------|--------------|
| Intake | `/new`, `/record` | Record screen, upload video/screenshots, paste PRD, PH draft URL, or browser agent |
| Audit | `/projects/[id]/audit` | Launch Doctor score (BYO Anthropic key) |
| Angle | `/projects/[id]/angle` | Pick story angle |
| Moments | `/projects/[id]/moments` | AI moment detection, A/B hook previews, full kit generation |
| Result | `/projects/[id]/result` | Launch kit tabs: video, PH, social, copy, share, analytics |
| Share | `/share/[id]` | Public page with video fallback chain + OG meta |
| Demo | `/projects/[id]/demo` | Supademo-style interactive walkthrough |
| Settings | `/settings` | Cloud sync, OAuth, media backup, render queue |

---

## P0 — Core product

- Full pipeline: intake → audit → moments → generate → result
- Shot-list compositor with auto-zoom, captions, optional TTS narration
- Ken-Burns path for screenshot uploads (hero + social clips)
- ZIP export, brand kit (`/brand`), share page fallbacks
- API helpers + IndexedDB storage quota errors
- Project delete with IndexedDB cleanup
- Record deep-link: `/new` → `/record` → return with project id
- Product Hunt draft intake (paste URL → prefill copy)

## P1 — Polish

- Library: footage/render status badges
- Result: partial regenerate (social only / copy only)
- Agent capture: progress UI + retry on `/new`
- ZIP: narrations script + separate audio track
- Voice chips on Copy tab → rewrite API

## P2 — Phase 10 cloud (optional env)

- **Clerk** auth + middleware
- **Postgres** project sync (`/api/projects`, auto-migrate from `db/schema.sql`)
- **Stripe** credits + checkout + webhook
- **Trigger.dev** render queue stub
- **Remotion Lambda** render stub
- **YouTube + Product Hunt** OAuth (`/settings`)

See `docs/PHASE10.md` for setup.

## P3 — Cloud integrations

- Bidirectional sync on sign-in (`POST /api/projects/sync`)
- S3/R2 blob backup via presigned uploads (`POST /api/blobs/presign`)
- Share page OG meta (`GET /api/share/[id]/meta`, `share/[id]/layout.tsx`)
- YouTube upload + PH publish API routes (OAuth-gated)

## P4 — Production polish

- **5-second teaser GIF** — auto-generated from hero render, in ZIP + Video tab
- **Publish panel** — YouTube + Product Hunt buttons on PH kit tab
- **Share analytics** — local views + Postgres `share_views` table
- Upload routes resolve `cloudBlobs` URLs; prompt cloud backup when missing

---

## Intelligence APIs (BYO keys)

| Route | Purpose |
|-------|---------|
| `POST /api/audit` | Launch Doctor audit |
| `POST /api/analyze` | Frame-based moment detection |
| `POST /api/transcribe` | Whisper transcript (OpenAI) |
| `POST /api/script` | Best-of-2 script variants |
| `POST /api/judge` | Quality judge before render |
| `POST /api/captions` | Launch + social captions |
| `POST /api/rewrite` | Copy voice rewrite |
| `POST /api/localize` | Localization |
| `POST /api/tts` | TTS (OpenAI / ElevenLabs) |
| `POST /api/agent` | Playwright URL capture |
| `POST /api/ph-draft` | PH draft URL prefill |

## Cloud APIs (optional)

| Route | Purpose |
|-------|---------|
| `GET/POST /api/projects` | List / upsert projects |
| `POST /api/projects/sync` | Bidirectional sync |
| `POST /api/blobs/presign` | S3/R2 presigned upload |
| `POST /api/youtube/upload` | YouTube publish (OAuth + cloud video) |
| `POST /api/producthunt/publish` | PH publish (OAuth + cloud video) |
| `GET/POST /api/share/[id]/views` | Share view counts |
| `GET /api/share/[id]/meta` | OG metadata |

Full cloud setup: `docs/PHASE10.md`.

---

## Storage model

| Layer | Technology | Contents |
|-------|------------|----------|
| Metadata | `localStorage` | Project JSON (angles, moments, assets, scripts, cloudBlobs refs) |
| Media | IndexedDB | Footage, renders, social clips, narration, teaser GIF |
| Cloud | Postgres | Synced project metadata per Clerk user |
| Blobs | S3/R2 | Optional backup of IndexedDB media |

---

## Agent build loop

- Backlog: `BUILD_BACKLOG.md` (P0–P4 all `[x]`)
- Tick: `npm run loop:tick`
- Continuous: `npm run loop:start` (15 min interval)
- Docs: `docs/BUILD_LOOP.md`

---

## P5 — Production wiring

- **YouTube upload** — real resumable upload from cloud video URL + OAuth token refresh
- **Product Hunt** — launch package + checklist (PH API cannot create posts)
- **Remotion Lambda** — async AWS Lambda invoke when configured
- **Settings** — recent render jobs list
- **Share tab** — live preview on result page

---

## Not yet wired (external / platform limits)

- Product Hunt post creation (platform does not expose this API)
- Remotion composition deploy on Lambda (requires your Remotion project + serve URL)
- Trigger.dev worker task implementation (`render-launch-video`)

---

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env.local   # optional — cloud features
npm run dev                    # http://localhost:3000
npm run verify                 # build + lint
```
