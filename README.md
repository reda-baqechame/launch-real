# LaunchReel

**The Product Video OS for software — the best way to show software.**

Turn screen recordings, URLs, or screenshots into professional launch videos, Product Hunt assets, social clips, copy, share pages, and interactive demos — without going on camera.

## Quick start

```bash
npm install
npx playwright install chromium   # browser-agent URL capture only
npm run dev                       # http://localhost:3000 — keep terminal open
npm run verify                    # build + lint (same as CI)
```

**Local test flow:** open `/new` → connect Anthropic key (optional but recommended) → record or upload → audit → angle → moments → generate → `/result`.

Copy `.env.example` → `.env.local` only for cloud features (Clerk, Postgres, Stripe, S3/R2, OAuth). The app runs fully without it.

**100% free local test mode:** set `LAUNCHREEL_LOCAL_FREE_MODE=true` in `.env.local`, run `npm run dev`, and open `http://localhost:3000/new`. On localhost only, LaunchReel uses deterministic local AI, voice, credits, checkout, render, OAuth, YouTube, and Product Hunt providers so every workflow can be tested without paid keys.

**Deploy online (hosted SaaS):** see [`docs/DEPLOY.md`](docs/DEPLOY.md) — set your Anthropic/OpenAI keys on the server, Clerk auth, Postgres, and Stripe. Users sign in and buy kit credits; BYO-key UI is hidden automatically.

**Troubleshooting:** if `localhost:3000` won't load, run `npm run dev` first. If builds fail on OneDrive, stop the dev server and delete `.next`, then `npm run verify` again.

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
| **AI skills** | 10 LaunchReel feature skills + 9 external pro skills — see `docs/SKILLS.md` |

## Flow

```
/new or /record → audit → angle → moments → generate → result → share
```

## Architecture

- **Default:** localStorage (metadata) + IndexedDB (blobs) — no backend required
- **Local free test:** `LAUNCHREEL_LOCAL_FREE_MODE=true` on localhost only, no paid providers required
- **Hosted SaaS:** Clerk + Postgres + server `ANTHROPIC_API_KEY` + Stripe — see `docs/DEPLOY.md`
- **Optional Phase 10:** cloud sync, S3/R2, Trigger.dev, OAuth — see `docs/PHASE10.md`
- **Local BYO keys:** Anthropic (AI), OpenAI (Whisper + TTS) or ElevenLabs (TTS) — hidden when hosted

## Docs

| File | Purpose |
|------|---------|
| [`docs/SKILLS.md`](docs/SKILLS.md) | **AI skills package** — feature skills + external pro skills |
| [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) | **Consolidated reference** — routes, outputs, APIs, modules |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | **Hosted SaaS deploy** — Vercel, env vars, Stripe, credits |
| [`docs/PHASE10.md`](docs/PHASE10.md) | Cloud setup guide |
| [`docs/BUILD_LOOP.md`](docs/BUILD_LOOP.md) | Agent build loop |
| [`BUILD_BACKLOG.md`](BUILD_BACKLOG.md) | Checkbox backlog (P0–P6 complete) |
