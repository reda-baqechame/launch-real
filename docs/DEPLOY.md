# Deploy LaunchReel as hosted SaaS

Run LaunchReel online with **your** API keys. Users sign in with Clerk and buy kit credits via Stripe. No BYO-key UI is shown when hosted mode is active.

For local QA without paid services, use `LAUNCHREEL_LOCAL_FREE_MODE=true` on `localhost`. That sandbox is blocked in production and should not be used as deploy proof.

Hosted mode activates automatically when all three are set:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`

## 1. Prerequisites

| Service | Purpose |
|---------|---------|
| [Vercel](https://vercel.com) (or Railway, Fly.io) | Next.js hosting |
| [Neon](https://neon.tech) or Supabase | Postgres |
| [Clerk](https://clerk.com) | Auth |
| [Stripe](https://stripe.com) | Payments |
| [Anthropic](https://console.anthropic.com) | Launch Doctor, scripts, captions |
| [OpenAI](https://platform.openai.com) (recommended) | Whisper transcription + TTS |
| [ElevenLabs](https://elevenlabs.io) (optional) | Alternative TTS |

## 2. Database

```bash
psql $DATABASE_URL -f db/schema.sql
```

New users receive **3 free kit credits** (`app_users.credits` default).

## 3. Stripe products

Create three one-time or subscription prices and set:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ONE_LAUNCH=price_...
STRIPE_PRICE_FOUNDER_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
```

Webhook endpoint (production):

```
https://YOUR_DOMAIN/api/stripe/webhook
```

Events: `checkout.session.completed`

## 4. Clerk

1. Create application at clerk.com
2. Add your production URL to allowed origins
3. Set keys in Vercel env:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

## 5. Server AI keys (required for hosted)

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # Whisper + TTS
ELEVENLABS_API_KEY=...         # optional if using OpenAI TTS only
```

These stay **server-side only**. The client never sees them.

## 6. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all env vars from `.env.example` in the Vercel dashboard → Settings → Environment Variables.

Set:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

Optional but recommended:

```env
RENDER_WEBHOOK_SECRET=...   # random string for render completion webhook
OAUTH_STATE_SECRET=...      # CSRF for OAuth (defaults to CLERK_SECRET_KEY)
```

## 7. Verify hosted mode

After deploy, check:

```bash
curl https://your-domain.com/api/public-config
```

Expected when fully configured:

```json
{
  "hosted": true,
  "clerk": true,
  "database": true,
  "cloudSync": true,
  "stripe": true,
  "serverTts": true,
  "serverTranscribe": true
}
```

## 8. How billing works

| Action | Credits |
|--------|---------|
| Sign up | 3 free kits |
| Full launch kit generation (Moments → Generate) | −1 credit |
| Cloud render queue (`POST /api/render-queue`) | −1 credit |
| Launch Doctor audit / moment analysis | Free (requires sign-in) |

When credits reach 0, generation returns `402` and the UI links to `/pricing`.

Watermark is removed when `credits > 0` (see `src/lib/watermark-policy.ts`).

## 9. Local free test mode

Use this when you want every route and button to work locally without Clerk, Stripe, Anthropic, OpenAI, ElevenLabs, OAuth, Trigger, Lambda, or S3 credentials:

```env
LAUNCHREEL_LOCAL_FREE_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Open `http://localhost:3000/new`. `/api/public-config` should report `"localFree": true`. Local free mode:

- Allows unlimited local kit/render credits
- Removes watermarks
- Uses deterministic local AI, TTS, transcription, render, checkout, OAuth, YouTube, and Product Hunt providers
- Only activates when `NODE_ENV !== "production"` and the request host is `localhost`, `127.0.0.1`, or `[::1]`

## 10. Local hosted testing

Copy `.env.example` → `.env.local` and fill Clerk + Postgres + Anthropic + Stripe (test mode):

```bash
npm run dev
```

Open `/new` — BYO key panels are hidden; sign in to use AI.

Stripe webhook locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 11. Security checklist

- [ ] All secrets in Vercel env (never commit `.env.local`)
- [ ] `RENDER_WEBHOOK_SECRET` set in production
- [ ] Stripe webhook secret matches dashboard
- [ ] Clerk production instance with correct redirect URLs
- [ ] `NEXT_PUBLIC_APP_URL` matches your live domain
- [ ] `LAUNCHREEL_LOCAL_FREE_MODE` is unset or `false` in production

## Architecture

```
User browser → Clerk session cookie
            → /api/audit, /api/script, … (no x-anthropic-key header)
            → Server uses ANTHROPIC_API_KEY from env
            → POST /api/credits/consume after successful kit generation
```

Local dev without server keys still works: users paste keys on `/new` (BYO mode).

See also: [`docs/PHASE10.md`](PHASE10.md) for cloud sync, S3, OAuth, and render queue.
