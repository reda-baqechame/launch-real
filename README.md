# LaunchReel

**The Product Video OS for software — the best way to show software.**

Your software is built. Now make people understand it. LaunchReel turns any
software product into a professional video, Product Hunt gallery, social clips,
launch copy, and a public share page — automatically.

This repository currently contains **Milestone 1: the polished UI foundation** —
every key screen of the product, built with the real premium dark UI and wired
to realistic in-memory mock data. No real video rendering, AI calls, recording,
or database yet; the goal of this milestone is a tangible, navigable product that
every later engine can plug into.

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
- `/new` — New project screen with a simulated "Analyze my launch" transition
- `/projects/[id]/audit` — **Launch Doctor**: score, breakdown, honest criticism
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

Real screen recorder, AI generation (Launch Doctor / copy), actual video
rendering, browser-agent capture, interactive demos, docs export, real analytics,
the localization engine, auth, database, and payments. Each has a screen here but
no working backend yet.
