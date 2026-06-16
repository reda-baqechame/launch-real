---
name: launchreel-product-hunt
description: Product Hunt launch kit for LaunchReel — gallery video, poster, screenshots, tagline, description, launch prep, publish panel. Use when working on PH assets, ph-draft, ph-launch-prep, or Product Hunt tab.
---

# Product Hunt kit

Also read: **`launchreel-quality-constitution`**, `.agents/skills/producthunt`.

## Code

- Build: `src/lib/launch-kit-build.ts`, `drawPhPoster()`
- Draft intake: `src/lib/ph-intake.ts`, `POST /api/ph-draft`
- Launch prep: `src/lib/ph-launch-prep.ts`, `POST /api/producthunt/publish`
- UI: `launch-kit-tabs.tsx` PH tab, `PublishPanel`, `ph-asset.tsx`

## Gallery order (pro standard)

Beat Canva templates: every asset references **this product's** demo moments, not stock layouts.

1. **Gallery video** — autoplay-muted hero 16:9; first 3s = PH scroll-stop hook
2. **Poster** — 1270×760, product name + hook
3. **5 screenshots** — story arc: problem → magic → proof → CTA
4. Tagline + description + first comment draft

## PH constraints

- Tagline: clear outcome, no jargon
- Description: first line = hook; bullets for features; link at end
- First comment: founder voice, offer to answer, no "please upvote"
- **No create-post API** — publish route returns checklist + package only

## Draft URL intake

- Host must be `producthunt.com`
- Fetch uses `redirect: manual` (SSRF-safe)
- Fallback to slug-based name if HTML fetch fails

## Checklist

- [ ] Gallery video has cloud URL or local blob before OAuth publish
- [ ] Poster readable at thumbnail size
- [ ] Screenshots cropped consistently (no random chrome)
