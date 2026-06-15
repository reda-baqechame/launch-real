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

Credits are stored on `app_users.credits` and consumed when enqueueing cloud renders.

## 3. Trigger.dev render queue

Set `TRIGGER_SECRET_KEY` and `TRIGGER_API_URL`. POST `/api/render-queue` creates a `render_jobs` row and dispatches to Trigger.dev task `render-launch-video`.

Without Trigger.dev, renders continue client-side in the browser.

## 4. Remotion Lambda

Set `REMOTION_LAMBDA_FUNCTION_NAME` and AWS credentials. POST `/api/render/lambda` returns a render id stub; wire `@remotion/lambda` in production.

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
| `POST /api/stripe/checkout` | Stripe Checkout session |
| `POST /api/stripe/webhook` | Credit fulfillment |
| `POST /api/render-queue` | Enqueue cloud render |
| `POST /api/render/lambda` | Remotion Lambda stub |
| `POST /api/projects/sync` | Push local + pull merged list |
| `POST /api/youtube/upload` | YouTube upload stub (OAuth required) |
| `POST /api/blobs/presign` | Presigned upload URL for footage/renders |
| `POST /api/producthunt/publish` | Product Hunt publish stub (OAuth required) |
| `GET /api/share/[id]/meta` | Public OG metadata for share pages |
