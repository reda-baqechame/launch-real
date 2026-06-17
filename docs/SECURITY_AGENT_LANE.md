# LaunchReel agent lane security review

Date: 2026-06-17

Scope: same-day real-app agent test lane, local-free mode, credential handling, SSRF controls, hosted credit gating, and test harness.

## Result

Focused Codex Security subagents found release-blocking issues before commit. The blocking issues were fixed and verified locally.

## Findings fixed

| Finding | Status | Fix |
|---------|--------|-----|
| Server-side browser could follow redirects/clicks/subresources into private networks | Fixed | Playwright request interception now validates every request against the starting host and URL safety rules. Page URL is rechecked during the action loop. |
| Production agent routes could run without app auth in a misconfigured deployment | Fixed | `/api/agent` and `/api/agent/plan` now require auth whenever `NODE_ENV=production`. |
| Optional credentials could be recorded on the login page | Fixed | Login now runs in a non-recorded Playwright context, then transfers `storageState` into the recorded context. |
| Credentials were sent to the planning endpoint | Fixed | Planning now sends only `hasCredentials`; raw credentials are sent only to `/api/agent`. |
| Credentials were not cleared on all UI paths | Fixed | Username and password are cleared after capture, on capture failure, and on cancel. |
| Hosted credits failed open while credit state was still loading | Fixed | Hosted generation now performs a fresh `/api/user/credits` preflight before provider/render work, then consumes the credit only after successful generation. |
| Product Hunt generated media replaced prepared text assets | Fixed | Generated PH media is merged into existing Product Hunt copy assets instead of replacing the full array. |
| Moderate PostCSS advisory through Next nested dependency | Fixed | `postcss` is overridden to `8.5.15`; `npm audit --omit=dev` reports zero vulnerabilities. |

## Residual production note

Browser-side local renders are still client-controlled by design. For a strict paid unwatermarked export boundary, production should treat browser renders as previews and issue unwatermarked final exports through an authenticated server/cloud render job after entitlement is confirmed.

For defense in depth, production hosting should also block private, link-local, loopback, and metadata egress at the platform/network layer. The app-level Playwright gate is present, but network egress policy is the stronger control.

## Verification

- `npm run verify`: pass
- `npm run smoke:agent-local`: pass
- `npm audit --omit=dev`: pass, zero vulnerabilities
- Production guard smoke: `LAUNCHREEL_LOCAL_FREE_MODE=true` under `next start` still reports `localFree: false`; signed-out production agent plan returns `401`
