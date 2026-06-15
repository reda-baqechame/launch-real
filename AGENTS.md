<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LaunchReel agent instructions

## Skills (read before feature work)

1. Start with `.cursor/skills/launchreel-orchestrator/SKILL.md`
2. Open the feature skill for your task (audit, video, copy, PH, etc.)
3. Use bundled external skills in `.agents/skills/` for copy, video, PH, Playwright, Next.js, Clerk

Full index: `docs/SKILLS.md`

## Build loop

When continuing the build or on `AGENT_LOOP_WAKE_BUILD`: read `BUILD_BACKLOG.md`, run `npm run verify`, implement one task, mark done.

## Conventions

- Client-first: localStorage + IndexedDB; cloud optional
- Minimal diffs; match `src/lib/` and `src/components/` patterns
- Pro output: specific hooks, muted-first clips, no hype slop
