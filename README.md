# LaunchReel

**The Product Video OS for software — the best way to show software.**

Turn screen recordings, URLs, or screenshots into professional launch videos, Product Hunt assets, and interactive demos — without going on camera.

## Run it

```bash
npm install
npx playwright install chromium   # for browser-agent URL capture
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## What's working

### Intelligence (BYO Anthropic key)
- Launch Doctor audit (`/api/audit`)
- Frame-based moment analysis + optional Whisper transcript (`/api/analyze`, `/api/transcribe`)
- Best-of-2 script variants with quality judge (`/api/script`, `/api/judge`)
- Launch captions + social clip captions (`/api/captions`)
- Copy rewrite + localization (`/api/rewrite`, `/api/localize`)

### Media engine (client-side)
- **Intake** — record, upload video, upload screenshots, paste PRD on `/new`
- **Shot-list compositor** — cuts to selected moments with zoom + captions
- **Ken-Burns path** — screenshot uploads render as true image Ken-Burns (main video + social clips)
- **A/B hook previews** — proxy renders of both script variants before final render
- **Social clips** — 3× 9:16 clips with platform captions
- **Product Hunt kit** — gallery poster, screenshots, linked hero video
- **ZIP export** — one-click `{project}-launch-kit.zip`
- **Interactive demo** — auto-prefilled from uploaded screenshots
- **Brand kit** — persisted in localStorage, applied to renders
- **Share page** — `/share/[id]` with render → social → footage fallback + PH poster

### Cloud (optional — `.env.local`)
- Clerk auth + Postgres project sync (bidirectional on sign-in)
- Stripe credits + render queue + Trigger.dev hook
- YouTube / Product Hunt OAuth on `/settings`
- See `docs/PHASE10.md`

### Flow
`/new` or `/record` → audit → angle → moments → generate kit → result → share

### Build loop
Autonomous agent iteration — see `docs/BUILD_LOOP.md`. Run `npm run loop:tick` or `npm run loop:start`.

## Architecture

- **Client-first default**: localStorage (metadata) + IndexedDB (blobs) — works without any cloud env vars
- **Phase 10 (optional)**: Clerk auth, Postgres project sync, Stripe credits, Trigger.dev queue, OAuth — see `docs/PHASE10.md`
- **BYO keys**: Anthropic (AI), OpenAI (Whisper + TTS) or ElevenLabs (TTS)
- **Agent**: Node.js + Playwright for Magic URL capture

Copy `.env.example` → `.env.local` to enable cloud features.
