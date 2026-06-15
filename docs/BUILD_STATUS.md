# LaunchReel — consolidated build reference

**Status:** P0–P6 complete · `npm run verify` green  
**Stack:** Next.js 16 · React 19 · client-first (localStorage + IndexedDB) · optional cloud (Clerk, Postgres, Stripe, S3/R2)

LaunchReel turns screen recordings, URLs, or screenshots into a **full launch kit** — hero video, social clips, Product Hunt assets, copy, share page, and interactive demo — without going on camera.

---

## User flow

```
/new or /record → audit → angle → moments → generate kit → result → share
```

| Step | Route | What happens |
|------|-------|--------------|
| Home | `/` | Landing + CTA |
| Intake | `/new`, `/record` | Record screen, upload video/screenshots, paste PRD/changelog, PH draft URL, or Playwright browser agent |
| Dashboard | `/dashboard` | Project list, delete |
| Library | `/library` | All projects with footage/render status badges |
| Audit | `/projects/[id]/audit` | Launch Doctor score (BYO Anthropic key) |
| Angle | `/projects/[id]/angle` | Pick story angle |
| Moments | `/projects/[id]/moments` | AI moment detection, A/B hook previews, full kit generation |
| Result | `/projects/[id]/result` | Launch kit tabs (video, PH, social, copy, landing, share, analytics, localize) |
| Demo | `/projects/[id]/demo` | Supademo-style interactive walkthrough builder |
| Share | `/share/[id]` | Public page — video, demo player, OG meta, analytics |
| Brand | `/brand` | Global brand kit (colors, voice, watermark, locales) |
| Pricing | `/pricing` | Stripe checkout (when cloud enabled) |
| Settings | `/settings` | Cloud sync, OAuth, media backup, render job list |

---

## Launch kit outputs

Every successful **Generate** from Moments produces:

| Asset | ID / format | Notes |
|-------|-------------|-------|
| Hero launch video | v1 · 16:9 | Product Hunt / YouTube |
| Vertical clip | v2 · 9:16 | TikTok / Reels / Shorts |
| Square clip | v3 · 1:1 | LinkedIn / X |
| Teaser GIF | v4 · 5s | Muted autoplay — email, README, PH gallery |
| Founder cut | v5 · 16:9 | Personal hook variant |
| Investor cut | v6 · 16:9 | Credibility-first hook variant |
| Social clips | 3× 9:16 | Problem hook · product magic · CTA |
| PH kit | Gallery video, poster, screenshots, tagline, description, first comment |
| Copy | X, LinkedIn, PH first comment (+ changelog posts if PRD pasted) |
| Landing page | Headline, subhead, bullets, CTA |
| ZIP export | All renders + narrations script + audio track |
| Share page | `/share/[id]` with video fallback chain |
| Interactive demo | Optional — built on `/demo`, embedded on share page |

**Watermark:** free / local renders include a LaunchReel end card. Removed when signed-in user has cloud credits (`shouldWatermark` policy).

**Music:** ambient pad fallback when `/music/bed.mp3` is missing.

---

## Build phases (P0 → P6)

### P0 — Core product

- Client-first pipeline: intake → audit → moments → generate → result
- Shot-list compositor: auto-zoom, captions, optional TTS narration
- Ken-Burns path for screenshot uploads (hero + social clips)
- ZIP export, brand kit, share page fallbacks
- API helpers + IndexedDB storage quota errors
- Project delete with IndexedDB cleanup
- Record deep-link: `/new` → `/record` → return with project id
- Product Hunt draft intake (paste URL → prefill copy)

### P1 — Polish

- Library: footage/render status badges
- Result: partial regenerate (social only / copy only)
- Agent capture: progress UI + retry on `/new`
- ZIP: narrations script + separate audio track
- Voice chips on Copy tab → rewrite API

### P2 — Phase 10 cloud (optional env)

- Clerk auth + middleware
- Postgres project sync (`/api/projects`, auto-migrate from `db/schema.sql`)
- Stripe credits + checkout + webhook
- Trigger.dev render queue stub
- Remotion Lambda render stub
- YouTube + Product Hunt OAuth (`/settings`)

Setup: `docs/PHASE10.md`

### P3 — Cloud integrations

- Bidirectional sync on sign-in (`POST /api/projects/sync`)
- S3/R2 blob backup via presigned uploads (`POST /api/blobs/presign`)
- Share page OG meta (`GET /api/share/[id]/meta`)
- YouTube upload + PH publish API routes (OAuth-gated)

### P4 — Production polish

- 5-second teaser GIF from hero render (+ ZIP + Video tab)
- Publish panel — YouTube + Product Hunt on PH kit tab
- Share analytics — local + Postgres `share_events`
- Upload routes resolve `cloudBlobs` URLs; prompt cloud backup when missing

### P5 — Production wiring

- YouTube resumable upload (Data API v3 + OAuth token refresh)
- Product Hunt launch package + checklist (PH has no create-post API)
- Remotion Lambda async invoke via AWS SDK
- Render job list on `/settings`
- Share tab live preview on result page

### P6 — Feature completion

- Watermark removal when cloud credits > 0 (all render paths)
- Founder + investor 16:9 cuts during kit generation
- Share page interactive demo embed + view/play/CTA analytics
- Changelog intake → launch copy (`sourceChangelog` + `buildChangelogAssets`)
- Localize tab persists `localizedLanguages` on brand kit
- Render queue completion webhook (`POST /api/render-queue/complete`)
- Trigger.dev worker stub (`workers/render-launch-video.ts`)
- CI: `.github/workflows/verify.yml`
- `.env.example` with all cloud vars including `RENDER_WEBHOOK_SECRET`

---

## API reference

### Intelligence (BYO keys — Anthropic, OpenAI, ElevenLabs)

| Route | Purpose |
|-------|---------|
| `POST /api/audit` | Launch Doctor audit |
| `POST /api/analyze` | Frame-based moment detection |
| `POST /api/transcribe` | Whisper transcript (OpenAI) |
| `POST /api/script` | Best-of-2 script variants |
| `POST /api/judge` | Quality judge before render |
| `POST /api/captions` | Launch + social captions |
| `POST /api/rewrite` | Copy voice rewrite |
| `POST /api/localize` | Market localization |
| `POST /api/tts` | TTS (OpenAI / ElevenLabs) |
| `POST /api/agent` | Playwright URL capture |
| `POST /api/agent/plan` | Agent capture plan |
| `POST /api/ph-draft` | PH draft URL prefill |

Keys are stored client-side (localStorage) — never sent to LaunchReel servers except as request headers to your own API routes.

### Cloud (optional — requires `.env.local`)

| Route | Purpose |
|-------|---------|
| `GET/POST /api/projects` | List / upsert synced projects |
| `GET/PUT/DELETE /api/projects/[id]` | Single project CRUD |
| `POST /api/projects/sync` | Bidirectional sync on sign-in |
| `GET /api/user/credits` | Credit balance + watermark policy |
| `POST /api/stripe/checkout` | Stripe Checkout session |
| `POST /api/stripe/webhook` | Credit fulfillment |
| `POST /api/blobs/presign` | S3/R2 presigned upload |
| `POST /api/render-queue` | Enqueue cloud render |
| `POST /api/render-queue/complete` | Render job completion webhook |
| `POST /api/render/lambda` | Remotion Lambda invoke |
| `POST /api/youtube/upload` | YouTube resumable upload |
| `POST /api/producthunt/publish` | PH launch kit prep |
| `GET /api/integrations` | OAuth connection status |
| `GET /api/share/[id]/meta` | OG metadata for share pages |
| `GET/POST /api/share/[id]/views` | Share analytics (views, plays, CTA) |
| OAuth | `/api/oauth/youtube/*`, `/api/oauth/producthunt/*` |

Full setup: `docs/PHASE10.md`

---

## Storage model

| Layer | Technology | Contents |
|-------|------------|----------|
| Metadata | `localStorage` | Projects, brand kit, API keys, share event counts |
| Media | IndexedDB | Footage, renders, social clips, narration, teaser GIF, variant cuts |
| Cloud | Postgres | Synced project metadata per Clerk user |
| Blobs | S3/R2 | Optional backup of IndexedDB media (`cloudBlobs` refs on project) |

Postgres tables (see `db/schema.sql`): `app_users`, `projects`, `oauth_connections`, `render_jobs`, `share_events`.

---

## Key modules

| Path | Role |
|------|------|
| `src/lib/store.ts` | Project state (localStorage) |
| `src/lib/footage-store.ts` | IndexedDB blobs + render keys |
| `src/lib/generate.ts` | Intake → new project |
| `src/components/moment-review.tsx` | Moment selection + full kit generation |
| `src/components/product-video.tsx` | Canvas compositor + ProductVideoStudio |
| `src/lib/social-clip-render.ts` | 9:16 social clip renderer |
| `src/lib/launch-kit-build.ts` | PH screenshots + poster |
| `src/lib/watermark-policy.ts` | Credits → watermark on/off |
| `src/lib/changelog-kit.ts` | PRD/changelog → copy assets |
| `src/lib/share-analytics.ts` | Local + remote share events |
| `src/lib/cloud/*` | S3, Stripe, Trigger, Lambda, YouTube, OAuth |
| `workers/render-launch-video.ts` | Trigger.dev task stub |

---

## Agent build loop

Backlog is **complete** (P0–P6 all `[x]` in `BUILD_BACKLOG.md`).

```bash
npm run loop:tick    # verify + print next task (none remaining)
npm run loop:start   # 15 min interval (Windows PowerShell)
```

Docs: `docs/BUILD_LOOP.md`

---

## Production hardening

- **SSRF protection** — agent URL validation, PH draft redirect checks, blob URLs allowlisted to S3/R2 only
- **OAuth CSRF** — HMAC-signed `state` on YouTube + Product Hunt flows
- **Webhook auth** — `RENDER_WEBHOOK_SECRET` required in production; jobs only finalize from `queued`/`processing`
- **Stripe idempotency** — `stripe_webhook_events` table; credits only on `payment_status=paid`
- **Ownership checks** — presign, render queue, and Lambda routes verify project belongs to user
- **Rate limits** — agent, share analytics, PH draft (in-memory per instance)
- **Payload caps** — TTS text, transcribe file size, analyze frames, sync batch size
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` via `next.config.ts`
- **Safe errors** — upstream API messages not leaked to clients on sensitive routes

Required production env: `RENDER_WEBHOOK_SECRET`, `OAUTH_STATE_SECRET` (or `CLERK_SECRET_KEY`), `NEXT_PUBLIC_APP_URL`.

---

## Platform limits (not code gaps)

| Limit | Reason |
|-------|--------|
| Product Hunt post creation | PH API does not expose create-post |
| Remotion on Lambda | Requires your Remotion project + serve URL deploy |
| Trigger.dev production render | Stub marks jobs complete — wire real render pipeline |
| Next.js middleware warning | `middleware` → `proxy` migration deferred; app works |

---

## Quick start

```bash
npm install
npx playwright install chromium   # browser-agent URL capture
cp .env.example .env.local        # optional — cloud features
npm run dev                         # http://localhost:3000
npm run verify                      # build + lint
```

Connect an **Anthropic key** on `/new` for AI audit, moments, scripts, and copy. Optional: OpenAI (Whisper + TTS) or ElevenLabs (TTS).
