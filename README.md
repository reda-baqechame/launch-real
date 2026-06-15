# LaunchReel

**The Product Video OS for software — the best way to show software.**

Turn screen recordings, URLs, or screenshots into professional launch videos, Product Hunt assets, and interactive demos — without going on camera.

## Quick start

```bash
npm install
npx playwright install chromium   # browser-agent URL capture
npm run dev                       # http://localhost:3000
npm run verify                    # build + lint
```

Copy `.env.example` → `.env.local` to enable optional cloud features (Clerk, Postgres, Stripe, S3/R2, OAuth).

## What’s built (P0–P4 complete)

**Full consolidated reference → [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md)**

| Area | Highlights |
|------|------------|
| **Intake** | Record, upload video/screenshots, PRD paste, PH draft URL, Playwright agent |
| **AI** | Launch Doctor audit, moment analysis, best-of-2 scripts + judge, captions, rewrite, localize, TTS |
| **Media** | Shot-list compositor, Ken-Burns screenshots, A/B hook previews, 3× social clips, teaser GIF |
| **Launch kit** | PH gallery, copy, landing page, ZIP export, brand kit, interactive demo builder |
| **Share** | Public `/share/[id]`, OG meta, view analytics (local + Postgres) |
| **Cloud** | Clerk auth, Postgres sync, S3/R2 blob backup, Stripe credits, OAuth publish panel |
| **Loop** | Agent build loop — `npm run loop:tick` · see `docs/BUILD_LOOP.md` |

## Flow

```
/new or /record → audit → angle → moments → generate → result → share
```

## Architecture

- **Default**: localStorage (metadata) + IndexedDB (blobs) — no backend required
- **Optional Phase 10**: Clerk, Postgres, Stripe, Trigger.dev, S3/R2, OAuth — see `docs/PHASE10.md`
- **BYO keys**: Anthropic (AI), OpenAI (Whisper + TTS) or ElevenLabs (TTS)

## Docs

| File | Purpose |
|------|---------|
| [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) | Consolidated feature list + API map |
| [`docs/PHASE10.md`](docs/PHASE10.md) | Cloud setup guide |
| [`docs/BUILD_LOOP.md`](docs/BUILD_LOOP.md) | Agent build loop |
| [`BUILD_BACKLOG.md`](BUILD_BACKLOG.md) | Checkbox backlog (all complete) |
