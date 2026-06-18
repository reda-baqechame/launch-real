# Railway deployment env

Paste secrets in Railway service variables, not in chat and not in git.

## Minimum live deploy

These let the app build and open on Railway:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Your Railway public URL, for example `https://launchreel.up.railway.app` |
| `LAUNCHREEL_LOCAL_FREE_MODE` | `false` |

## Minimum real AI test

These enable real provider-backed generation once production auth/storage are configured:

| Variable | Why |
|----------|-----|
| `ANTHROPIC_API_KEY` | Audit, script, captions, judge, rewrite, localization, operator decisions |
| `OPENAI_API_KEY` | Transcription and OpenAI TTS |
| `ELEVENLABS_API_KEY` | Optional premium voice TTS |

## Hosted SaaS production

For a paid SaaS deployment, add:

| Variable | Why |
|----------|-----|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser auth |
| `CLERK_SECRET_KEY` | Clerk server auth |
| `DATABASE_URL` | Postgres project sync, ownership, credits |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe checkout client |
| `STRIPE_SECRET_KEY` | Stripe checkout server |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `STRIPE_PRICE_ONE_LAUNCH` | One-launch credit price |
| `STRIPE_PRICE_FOUNDER_PRO` | Founder Pro price |
| `STRIPE_PRICE_STUDIO` | Studio price |
| `RENDER_WEBHOOK_SECRET` | Render completion webhook auth |
| `OAUTH_STATE_SECRET` | OAuth CSRF state signing |

## Optional integrations

| Variable | Why |
|----------|-----|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube OAuth/upload |
| `PRODUCT_HUNT_CLIENT_ID`, `PRODUCT_HUNT_CLIENT_SECRET` | Product Hunt OAuth/connect |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3/R2 storage and exports |
| `REMOTION_LAMBDA_FUNCTION_NAME` | Remotion Lambda renders |
| `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL` | Trigger.dev render queue |

## Test after Railway deploys

```powershell
$env:RAILWAY_APP_URL="https://your-app.up.railway.app"
npm run smoke:railway
```

For stricter provider readiness:

```powershell
npm run smoke:railway -- -RequireProviders
```
