---
name: launchreel-orchestrator
description: Routes LaunchReel work to the right feature skill and quality bar. Use when building, improving, or debugging any LaunchReel feature — audit, moments, video, copy, Product Hunt, share, demo, agent capture, publish, or full launch kit.
---

# LaunchReel orchestrator

Read `docs/BUILD_STATUS.md` for architecture. Pick **one** feature skill below and follow it end-to-end before touching code.

## Feature → skill map

| User intent | Skill | Code entry |
|-------------|-------|------------|
| Launch Doctor audit, score, hooks | `launchreel-audit` | `src/app/api/audit/route.ts`, `/projects/[id]/audit` |
| Moment detection, shot list | `launchreel-moments-script` | `src/app/api/analyze`, `moment-review.tsx` |
| Script, judge, TTS, narration | `launchreel-moments-script` | `src/app/api/script`, `judge`, `tts` |
| Hero video, clips, GIF, v5/v6 | `launchreel-video-render` | `product-video.tsx`, `social-clip-render.ts` |
| X, LinkedIn, PH comment, rewrite | `launchreel-launch-copy` | `captions`, `rewrite`, `changelog-kit` |
| PH gallery, poster, launch prep | `launchreel-product-hunt` | `launch-kit-build`, `ph-launch-prep` |
| Share page, demo, analytics | `launchreel-share-demo` | `share/[id]`, `share-demo-player.tsx` |
| URL agent, Playwright capture | `launchreel-agent-capture` | `src/app/api/agent` |
| YouTube, cloud, credits | `launchreel-cloud-publish` | `youtube-upload`, `render-queue` |
| Brand kit, localization | `launchreel-brand-localize` | `/brand`, `localize-tab`, `/api/localize` |

## Bundled external skills (`.agents/skills/`)

Use alongside feature skills when writing copy or infra:

- **copywriting**, **twitter-x-posts**, **linkedin-posts** — launch copy
- **video-marketing**, **youtube-seo** — video + YouTube publish
- **producthunt** — PH launch strategy
- **playwright-best-practices** — agent capture hardening
- **nextjs-app-router-patterns**, **clerk-nextjs-patterns** — app/cloud routes

## Pro quality gate (every feature)

Before marking work done:

1. Run `npm run verify`
2. Match existing patterns in `src/lib/` and `src/components/`
3. Client-first: works without cloud env vars
4. No hype slop — specific to the product, founder-grade tone
5. Muted-first: social clips and share video must work without sound

## Giant benchmark

Beat Loom + Canva + PH launch templates by being **specific** (product moments, not stock), **fast** (one recording → full kit), and **distribution-ready** (copy + clips + share page in one pass).
