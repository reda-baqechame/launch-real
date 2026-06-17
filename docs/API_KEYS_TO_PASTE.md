# LaunchReel API keys to prepare

Use `npm run prepare:env` to create or update `.env.local` with blank slots, then paste keys there. `.env.local` is ignored by git and must never be committed.

## Local free testing

These are enough to test the app locally without paid providers:

| Env var | Why |
|---------|-----|
| `LAUNCHREEL_LOCAL_FREE_MODE=true` | Enables the zero-cost localhost-only sandbox. |
| `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Gives generated links and share URLs a local base URL. |
| `LAUNCHREEL_AGENT_ALLOWED_HOSTS=localhost,127.0.0.1,<your-test-host>` | Lets the dev-only browser agent visit local or staging apps without weakening production SSRF rules. |

## Required for hosted SaaS production

| Provider | Env vars | Why |
|----------|----------|-----|
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Production sign-in, protected AI/cloud routes, and user identity. |
| Postgres | `DATABASE_URL` | Project persistence, credits, cloud sync, and ownership checks. |
| Anthropic | `ANTHROPIC_API_KEY` | Launch audit, script, captions, judge, rewrite/localize, and real operator decisions. |
| OpenAI | `OPENAI_API_KEY` | Transcription, TTS, and future OpenAI agent/eval paths. Create/write this only through the secure OpenAI Platform flow or paste it into `.env.local` yourself. |
| Stripe | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ONE_LAUNCH`, `STRIPE_PRICE_FOUNDER_PRO`, `STRIPE_PRICE_STUDIO` | Checkout, credit packs/plans, webhook verification, and paid entitlement enforcement. |
| Render webhook | `RENDER_WEBHOOK_SECRET` | Authenticates render worker completion callbacks. |
| OAuth state | `OAUTH_STATE_SECRET` | Signs OAuth state to prevent CSRF. Defaults to Clerk secret only if unset, but a separate secret is better. |

## Optional production upgrades

| Provider | Env vars | Why |
|----------|----------|-----|
| ElevenLabs | `ELEVENLABS_API_KEY` | Human-like premium voice narration when you do not want OpenAI TTS. |
| Trigger.dev | `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL` | External render queue orchestration. |
| Remotion Lambda / AWS | `REMOTION_LAMBDA_FUNCTION_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Server/cloud rendering for paid unwatermarked exports. |
| S3 or Cloudflare R2 | `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_URL`, plus AWS/R2 credentials | Durable media storage, share pages, ZIP exports, and render artifacts. |
| Google/YouTube OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube upload/publish-prep integration. |
| Product Hunt OAuth | `PRODUCT_HUNT_CLIENT_ID`, `PRODUCT_HUNT_CLIENT_SECRET` | Product Hunt OAuth/account connection where supported; LaunchReel prepares PH assets manually. |

## Commands after pasting keys

```powershell
npm run verify
npm run smoke:agent-local
npm run smoke:production-guard
npm run smoke:real-providers
```

`npm run smoke:real-providers` intentionally fails fast until the required production keys above are present.
