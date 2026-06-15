---
name: launchreel-cloud-publish
description: LaunchReel cloud publish — YouTube upload, credits, render queue, S3 backup, OAuth. Use when working on settings, stripe, youtube-upload, render-queue, or Phase 10 cloud features.
---

# Cloud publish + credits

Also read: `.agents/skills/youtube-seo`, `clerk-nextjs-patterns`, `docs/PHASE10.md`.

## Code

- YouTube: `src/lib/cloud/youtube-upload.ts`, `POST /api/youtube/upload`
- PH prep: `POST /api/producthunt/publish`
- Credits: `GET /api/user/credits`, Stripe webhook, `watermark-policy.ts`
- Render queue: `POST /api/render-queue`, webhook `render-queue/complete`
- Blobs: `POST /api/blobs/presign`, `blob-cloud-sync.ts`
- OAuth: signed state via `src/lib/oauth-state.ts`

## Publish prerequisites

1. User signed in (Clerk)
2. Project synced to Postgres
3. Hero video in `cloudBlobs` (run backup on `/settings`)
4. OAuth connected for target platform

## YouTube pro defaults

- Privacy: `unlisted` unless user picks public/private
- Title: `{productName} — launch video` (max 100 chars)
- Description: one-liner + "Created with LaunchReel"
- Category: 28 (Science & Technology)
- Video URL must pass `isAllowedBlobPublicUrl`

## Production env

Required in prod: `RENDER_WEBHOOK_SECRET`, `OAUTH_STATE_SECRET` (or `CLERK_SECRET_KEY`), `NEXT_PUBLIC_APP_URL`.

## Checklist

- [ ] Cloud routes return 503 when feature flag off
- [ ] Presign verifies project ownership
- [ ] Credits consumed only after project validation
