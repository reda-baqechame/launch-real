# LaunchReel

**The Product Video OS for software — the best way to show software.**

Your software is built. Now make people understand it. LaunchReel turns any
software product into a professional video, Product Hunt gallery, social clips,
launch copy, and a public share page — automatically.

This repository currently contains the **polished, working UI foundation** —
every key screen of the product, built with the real premium dark UI. The app is
**stateful**: pasting a product (or finishing a recording) generates a tailored
launch — score, angles, copy, assets — that's saved to your browser
(localStorage) and shows up on the dashboard. There's a **real in-browser screen
recorder**. No server-side AI or video rendering yet; those engines plug into the
same data model.

### What's actually wired

- **Create a launch** — `/new` derives a product name from the URL/description and
  builds a personalized, deterministic project, then routes you through the flow.
- **Record** — `/record` captures a real screen recording (with camera bubble);
  "turn into a launch kit" creates a project from it.
- **Persistence** — created projects live in `localStorage` and list on the
  dashboard and in the library. Seed projects ship for an out-of-the-box demo.
- **Client store** — `src/lib/store.tsx` (`useSyncExternalStore`) +
  `src/lib/generate.ts` (the personalization layer).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first theme in `src/app/globals.css`)
- Mock data layer — no backend/DB this milestone

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # typecheck + production build
npm run lint
```

## What's in the build

Marketing
- `/` — Landing page (hero, the pain, the transformation, output grid, CTA)
- `/pricing` — Monetization tiers
- `/share/[id]` — Public share page (the growth loop)

The app (`src/app/(app)`, shared sidebar + topbar shell)
- `/dashboard` — Recent launches, credits, create-mode grid
- `/record` — **Real in-browser screen recorder** (`getDisplayMedia` + canvas
  compositing + `MediaRecorder`): screen capture with a baked-in circular camera
  bubble, mic audio, countdown, pause/resume, teleprompter, and a real playable
  recording you can download — then turn it into a launch kit. Fully client-side;
  nothing is uploaded. Needs a secure context (HTTPS or localhost).
- `/new` — New project screen with a simulated "Analyze my launch" transition
- `/projects/[id]/audit` — **Launch Doctor**: score, breakdown, honest criticism.
  Connect an Anthropic API key on `/new` and this becomes a **real** Claude audit
  (`claude-opus-4-8`, structured output) via `/api/audit`; without a key it uses
  the built-in generator. The key lives only in your browser and is sent per
  request — never stored server-side.
- `/projects/[id]/angle` — **Narrative Builder**: selectable launch angles
- `/projects/[id]/moments` — **Demo Director**: moment review with story roles
- `/projects/[id]/result` — **Launch Kit** with all tabs (Video / Product Hunt /
  Social / Copy / Landing Page / Share / Analytics / Localize) + Quality Judge
- `/brand` — Brand Kit settings
- `/library` — Where product videos live

Try the full flow: `/` → `/new` → **Analyze my launch** → audit → angle →
moments → **Make the launch kit** → result.

## Code map

- `src/lib/types.ts` — the data model (projects, audits, angles, moments, assets,
  analytics, brand kit) mirroring the product vision's entities
- `src/lib/mock-data.ts` — three fully-populated sample projects
- `src/components/` — shared UI (`ui.tsx`), app shell, and the interactive
  engines (angle selector, moment review, launch-kit tabs)

## Deferred to later milestones

Real copy/asset generation, automatic editing (silence & filler-word removal,
smart zoom), transcripts & chapters, browser-agent capture, interactive demos,
docs export, real analytics, the localization engine, auth, database, and
payments. Each has a screen here but no working backend yet.

**Real and working today (no key needed):**
- The screen recorder (`/record`) — fully client-side.
- The **launch video** — the Video tab renders a real, downloadable product
  video in your browser (canvas animation → `MediaRecorder`) from the project's
  hook/score and your brand-kit colors, in **16:9, 9:16, or 1:1**. Play a preview
  or generate the file.
- **Interactive demos** (`/projects/[id]/demo`) — upload screenshots, place a
  hotspot + tooltip per step, then play a clickable walkthrough that ends on your
  brand CTA (Supademo-style). Reachable from the launch-kit result header.

**Real and working today (with an Anthropic key connected):**
- The **Launch Doctor** audit (`/api/audit`) — real score, breakdown, criticism.
- The **Narrative Builder** (`/api/angles`) — 5 product-specific launch angles.
- Live **copy rewriting** (`/api/copy`) — the Rewrite / "More founder-like" /
  "Less hype" buttons on every copy asset (Copy, Product Hunt, Landing tabs)
  call Claude and replace the text in place.
- **Recording recap** (`/api/recap`) — on the recorder review screen, turn the
  narration + length into a clean title, summary, and timecoded chapters.
- **Localize** (`/api/localize`) — adapt (not literally translate) the launch
  copy into French / Arabic / Spanish / Portuguese, with RTL rendering for Arabic.

The **Brand Kit** (`/brand`) persists to your browser (live end-card preview),
and its CTA is fed into the copy and localize engines so output stays on-brand —
no key required to save it.

The audit and angles are generated in parallel the moment you click **Analyze my
launch** on `/new`; without a key, everything falls back to the built-in
generator.
