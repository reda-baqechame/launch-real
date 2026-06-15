---
name: launchreel-share-demo
description: LaunchReel share page, interactive demo player, OG meta, and share analytics. Use when working on /share, demo builder, share-events, or distribution analytics.
---

# Share page + demo

## Code

- Share page: `src/app/share/[id]/page.tsx`
- OG meta: `src/app/share/[id]/layout.tsx`, `GET /api/share/[id]/meta`
- Demo player: `src/components/share-demo-player.tsx`
- Analytics: `src/lib/share-analytics.ts`, `POST /api/share/[id]/views`
- Demo builder: `src/app/(app)/projects/[id]/demo/page.tsx`, `demo-builder.tsx`
- Video fallback: `src/lib/share-video.ts` — render → social → footage → poster

## Share page pro standard

- Hero: 16:9 video autoplay **muted** with poster fallback
- CTA: product URL + "Make yours free" footer
- Interactive demo embed when `project.interactiveDemo` exists
- Track: view on load, play on video play, cta on button click

## Interactive demo

- 3–6 steps with hotspot tooltips
- Last step CTA opens product URL
- Screenshots from IndexedDB `screenshot` kind keys

## Analytics

- Local: `launchreel.share_events` in localStorage
- Server: Postgres `share_events` when `DATABASE_URL` set
- Analytics tab merges both via `analyticsWithViews()`

## Checklist

- [ ] Share works when only cloud blob exists (no local IndexedDB)
- [ ] OG meta uses `resolveTrustedBlobUrl` for video URL
- [ ] Rate limit respected on analytics POST (60/min/IP/project)
