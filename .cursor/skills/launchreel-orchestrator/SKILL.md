---
name: launchreel-orchestrator
description: Routes LaunchReel work to the right feature skill and quality bar. Use when building, improving, or debugging any LaunchReel feature — audit, moments, video, copy, Product Hunt, share, demo, agent capture, publish, or full launch kit.
---

# LaunchReel orchestrator

Read `docs/BUILD_STATUS.md` for architecture. Read **`launchreel-quality-constitution`** before any prompt or copy change.

Pick **one** feature skill below and follow it end-to-end before touching code.

## Feature → skill map

| User intent | Skill | Code entry |
|-------------|-------|------------|
| Quality bar, banned phrases, benchmarks | `launchreel-quality-constitution` | `src/lib/ai-prompts.ts` |
| Launch Doctor audit, score, hooks | `launchreel-audit` | `src/app/api/audit/route.ts`, `/projects/[id]/audit` |
| Moment detection, shot list | `launchreel-moments-script` | `src/app/api/analyze`, `moment-review.tsx` |
| Script, judge, TTS, narration | `launchreel-moments-script` | `src/app/api/script`, `judge`, `tts` |
| Hero video, clips, GIF, v5/v6 | `launchreel-video-render` | `product-video.tsx`, `social-clip-render.ts` |
| X, LinkedIn, PH comment, rewrite | `launchreel-launch-copy` | `captions`, `rewrite`, `changelog-kit` |
| PH gallery, poster, launch prep | `launchreel-product-hunt` | `launch-kit-build`, `ph-launch-prep` |
| Share page, demo, analytics | `launchreel-share-demo` | `share/[id]`, `share-demo-player.tsx` |
| URL agent, Playwright capture | `launchreel-agent-capture` | `src/app/api/agent`, `agent/plan` |
| YouTube, cloud, credits | `launchreel-cloud-publish` | `youtube-upload`, `render-queue` |
| Brand kit, localization | `launchreel-brand-localize` | `/brand`, `localize-tab`, `/api/localize` |

## Prompt library (production)

All intelligence system prompts live in **`src/lib/ai-prompts.ts`**:

- `AUDIT_SYSTEM`, `ANALYZE_SYSTEM`, `scriptSystem()`, `JUDGE_SYSTEM`, `CAPTIONS_SYSTEM`
- `REWRITE_MODE_GUIDES`, `localizeSystem()`, `AGENT_PLAN_SYSTEM`, `AGENT_DRIVER_SYSTEM()`
- `BANNED_PHRASES`, `QUALITY_SELF_CHECK`

Do not duplicate these strings in route files.

## Bundled external skills (`.agents/skills/`)

Use alongside feature skills when writing copy or infra:

- **copywriting**, **twitter-x-posts**, **linkedin-posts** — launch copy
- **video-marketing**, **youtube-seo** — video + YouTube publish
- **producthunt** — PH launch strategy
- **playwright-best-practices** — agent capture hardening
- **nextjs-app-router-patterns**, **clerk-nextjs-patterns** — app/cloud routes

## Pro quality gate (every feature)

Before marking work done:

1. Read `launchreel-quality-constitution` — pass 5-second stranger test
2. Run `npm run verify`
3. Match existing patterns in `src/lib/` and `src/components/`
4. Client-first: works without cloud env vars
5. Muted-first: social clips and share video must work without sound

## Giant benchmark

Beat Loom + Descript + Canva + top PH launches by being **specific** (this product's UI moments), **fast** (one recording → full kit), and **distribution-ready** (copy + clips + share page in one pass). Generic output is a bug.
