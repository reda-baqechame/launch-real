# Phase 10 — Cloud infrastructure

LaunchReel stays **client-first** without env vars. Enable cloud features by copying `.env.example` to `.env.local`.

## 1. Auth + Postgres project sync

1. Create a [Clerk](https://clerk.com) application.
2. Provision Postgres (Neon, Supabase, or local).
3. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`.
4. Run schema: `psql $DATABASE_URL -f db/schema.sql` (or auto-migrate on first API call).

**Behavior**

- Signed-out users: localStorage + IndexedDB only (unchanged).
- Signed-in users: project metadata syncs to `projects` table via `/api/projects`.
- Optional: footage and renders upload to S3/R2 via presigned URLs (`POST /api/blobs/presign`). Public URLs stored on `project.cloudBlobs`.

## 2. Stripe credits

1. Create Stripe products/prices for One Launch, Founder Pro, Studio.
2. Set `STRIPE_*` and price ids in `.env.local`.
3. Webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. `/pricing` checkout adds credits on `checkout.session.completed`.

Credits are stored on `app_users.credits` and consumed when:

- Enqueueing cloud renders (`POST /api/render-queue`)
- Starting full launch kit generation in hosted SaaS mode (`POST /api/credits/consume`)

## Hosted SaaS mode

When Clerk + Postgres + `ANTHROPIC_API_KEY` are configured, the app runs in **hosted mode**:

- Server uses your API keys; BYO-key UI on `/new` is hidden
- All AI routes require Clerk sign-in
- Kit generation deducts one credit after a launch kit is successfully generated
- Public flag: `GET /api/public-config` → `{ hosted: true, … }`

Full deploy guide: [`docs/DEPLOY.md`](DEPLOY.md)

## Local free test mode

Set `LAUNCHREEL_LOCAL_FREE_MODE=true` while running on `localhost` to test all hosted-style flows without paid providers. This mode returns `"localFree": true` from `GET /api/public-config`, gives unlimited local test credits, removes watermarks, and uses deterministic local providers for AI, voice, checkout, render, OAuth, YouTube, and Product Hunt. It is blocked when `NODE_ENV=production` or when the request host is not localhost/127.0.0.1.

## 3. Trigger.dev render queue

Set `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`, and optionally `RENDER_WEBHOOK_SECRET`. POST `/api/render-queue` creates a `render_jobs` row and dispatches to Trigger.dev task `render-launch-video`. The worker stub in `workers/render-launch-video.ts` POSTs back to `/api/render-queue/complete`.

Without Trigger.dev, renders continue client-side in the browser.

## 4. Remotion Lambda

Set `REMOTION_LAMBDA_FUNCTION_NAME` and AWS credentials. POST `/api/render/lambda` invokes your Lambda function asynchronously with the project payload.

## 5. OAuth (YouTube + Product Hunt)

| Provider | Authorize | Callback |
|----------|-----------|----------|
| YouTube | `/api/oauth/youtube/authorize` | `/api/oauth/youtube/callback` |
| Product Hunt | `/api/oauth/producthunt/authorize` | `/api/oauth/producthunt/callback` |

Tokens stored in `oauth_connections`. Manage connections on `/settings`.

## 6. Object storage (S3 / R2)

Set `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. For Cloudflare R2, also set `S3_ENDPOINT` and `S3_PUBLIC_URL`.

- `POST /api/blobs/presign` — presigned PUT for client uploads
- On sign-in, `CloudSyncProvider` uploads IndexedDB blobs and saves `cloudBlobs` on each project
- Share pages use cloud URLs when local blobs are unavailable

## API summary

| Route | Purpose |
|-------|---------|
| `GET/POST /api/projects` | List / upsert synced projects |
| `GET/PUT/DELETE /api/projects/[id]` | Single project CRUD |
| `GET /api/user/credits` | Credit balance |
| `POST /api/credits/consume` | Deduct one kit credit (hosted SaaS) |
| `GET /api/public-config` | Hosted vs BYO mode flags |
| `POST /api/stripe/checkout` | Stripe Checkout session |
| `POST /api/stripe/webhook` | Credit fulfillment |
| `POST /api/render-queue` | Enqueue cloud render |
| `POST /api/render-queue/complete` | Mark render job done (webhook) |
| `POST /api/render/lambda` | Remotion Lambda invoke |
| `POST /api/projects/sync` | Push local + pull merged list |
| `POST /api/youtube/upload` | YouTube resumable upload (OAuth + cloud video) |
| `POST /api/blobs/presign` | Presigned upload URL for footage/renders |
| `POST /api/producthunt/publish` | PH launch kit prep (no create-post API) |
| `GET /api/share/[id]/meta` | Public OG metadata for share pages |
| `GET/POST /api/share/[id]/views` | Share page analytics (views, plays, CTA) |
