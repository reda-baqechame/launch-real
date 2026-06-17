# Real app testing

Use this lane when you want LaunchReel to browse a real app URL, silently capture the session, then generate narration, captions, videos, launch copy, a share page, analytics, and ZIP export.

## Local free same-day smoke

```bash
npm run smoke:agent-local
```

The smoke script starts Next.js in local free mode if needed, opens `/new`, chooses `Give agent access`, plans the demo, captures a test site, generates the kit, checks the result/share pages, and verifies TTS audio.

Expected `/api/public-config` signal:

```json
{ "localFree": true }
```

## Testing your app URL today

1. Start local free mode:

```bash
$env:LAUNCHREEL_LOCAL_FREE_MODE="true"
npm run dev
```

2. If your app is local, private, or HTTP-only, allow its host for dev:

```bash
$env:LAUNCHREEL_AGENT_ALLOWED_HOSTS="localhost,127.0.0.1,your-staging-host"
```

3. Open `http://localhost:3000/new`.
4. Paste the app URL and a short product description.
5. Choose `Give agent access`.
6. Fill the demo goal, optional instructions, avoid list, stop condition, and optional disposable login credentials.
7. Click `Plan demo`, edit the plan if needed, then click `Explore & record`.
8. Continue through `audit -> angle -> moments -> result`.
9. Confirm the result tabs include video, Product Hunt, social clips, copy, landing page, share page, analytics, localization, and ZIP export.
10. Open the generated share page and export the ZIP.

Credentials are request-only. The UI sends them only to the capture request for Playwright login attempts, then clears the username and password before navigation. Login happens before recording starts, and credentials are not saved in localStorage, IndexedDB, project JSON, or docs. Captured app screens may still show account identity, so use disposable test accounts.

## Production guardrails

- `LAUNCHREEL_LOCAL_FREE_MODE=true` is ignored when `NODE_ENV=production`.
- `LAUNCHREEL_AGENT_ALLOWED_HOSTS` is ignored in production.
- Hosted protected routes still require Clerk.
- Missing hosted provider keys return `503` instead of falling back to mocks.
- Credits are consumed after successful kit generation, not during planning or capture.
- Product Hunt remains package preparation only; public post creation still requires the Product Hunt UI.
