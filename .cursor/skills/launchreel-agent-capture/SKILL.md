---
name: launchreel-agent-capture
description: LaunchReel Playwright browser agent for URL-based product capture. Use when working on /api/agent, agent plan, /new agent intake, or demo recording from URLs.
---

# Browser agent capture

Also read: **`launchreel-quality-constitution`**, `.agents/skills/playwright-best-practices`.

## Code

- Agent loop: `src/app/api/agent/route.ts` (max 120s) — `AGENT_DRIVER_SYSTEM()`
- Plan step: `src/app/api/agent/plan/route.ts` — `AGENT_PLAN_SYSTEM`
- UI: `/new` agent mode with progress + retry
- Security: `src/lib/url-safety-server.ts` — HTTPS, no private IPs

## Capture flow

1. Validate URL (DNS + SSRF checks)
2. Playwright records 1280×720 webm + click map
3. Claude drives up to 10 steps from plan + screenshots
4. `goto` actions **same hostname only**
5. Return `videoBase64`, `clicks`, `screenshots`

## Pro demo capture

- Show core magic moment within 60s
- Avoid login walls — if blocked, return partial + clear error
- Clicks normalized 0–1 for compositor zoom
- Rate limit: 6 requests/min/IP

## Checklist

- [ ] Temp session dir cleaned in `finally`
- [ ] 422 when no video and no screenshots
- [ ] Never navigate to metadata/internal URLs
