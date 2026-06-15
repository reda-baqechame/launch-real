# LaunchReel

**The Product Video OS for software — the best way to show software.**

Turn screen recordings, URLs, or screenshots into professional launch videos, Product Hunt assets, social clips, copy, share pages, and interactive demos — without going on camera.

## Quick start

```bash
npm install
npx playwright install chromium   # browser-agent URL capture
npm run dev                       # http://localhost:3000
npm run verify                    # build + lint
```

Copy `.env.example` → `.env.local` for optional cloud features (Clerk, Postgres, Stripe, S3/R2, OAuth).

## What’s built (P0–P6 complete)

**Full reference → [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md)**

| Area | Highlights |
|------|------------|
| **Intake** | Record, upload video/screenshots, PRD/changelog paste, PH draft URL, Playwright agent |
| **AI** | Launch Doctor audit, moment analysis, best-of-2 scripts + judge, captions, rewrite, localize, TTS |
| **Video** | Shot-list compositor, Ken-Burns screenshots, A/B hook previews, founder/investor cuts, teaser GIF |
| **Social** | 3× 9:16 clips (problem · magic · CTA), watermark policy tied to cloud credits |
| **Launch kit** | PH gallery, copy, landing page, ZIP export, brand kit, interactive demo builder |
| **Share** | Public `/share/[id]`, OG meta, demo embed, view/play/CTA analytics (local + Postgres) |
| **Cloud** | Clerk auth, Postgres sync, S3/R2 backup, Stripe credits, YouTube upload, PH launch prep |
| **Ops** | GitHub Actions CI, Trigger worker stub, render completion webhook |

## Flow

```
/new or /record → audit → angle → moments → generate → result → share
```

## Architecture

- **Default:** localStorage (metadata) + IndexedDB (blobs) — no backend required
- **Optional Phase 10:** Clerk, Postgres, Stripe, Trigger.dev, S3/R2, OAuth — see `docs/PHASE10.md`
- **BYO keys:** Anthropic (AI), OpenAI (Whisper + TTS) or ElevenLabs (TTS)

## Docs

| File | Purpose |
|------|---------|
| [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) | **Consolidated reference** — routes, outputs, APIs, modules |
| [`docs/PHASE10.md`](docs/PHASE10.md) | Cloud setup guide |
| [`docs/BUILD_LOOP.md`](docs/BUILD_LOOP.md) | Agent build loop |
| [`BUILD_BACKLOG.md`](BUILD_BACKLOG.md) | Checkbox backlog (P0–P6 complete) |
