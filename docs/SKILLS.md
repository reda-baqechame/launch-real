# LaunchReel AI skills package

Professional agent skills for every LaunchReel feature — custom LaunchReel skills plus curated external skills from [skills.sh](https://skills.sh).

## Quick start

When working on any feature, read **`launchreel-orchestrator`** first (`.cursor/skills/launchreel-orchestrator/SKILL.md`).

Restore external skills on a fresh clone:

```bash
npx skills experimental_install
```

Or install individually:

```bash
npx skills add kostja94/marketing-skills --skill copywriting video-marketing linkedin-posts twitter-x-posts youtube-seo -y --agent cursor --copy
npx skills add dylanfeltus/skills --skill producthunt -y --agent cursor --copy
npx skills add currents-dev/playwright-best-practices-skill --skill playwright-best-practices -y --agent cursor --copy
npx skills add wshobson/agents --skill nextjs-app-router-patterns -y --agent cursor --copy
npx skills add clerk/skills --skill clerk-nextjs-patterns -y --agent cursor --copy
```

## LaunchReel feature skills (`.cursor/skills/`)

| Skill | Feature |
|-------|---------|
| `launchreel-orchestrator` | Routes all work — start here |
| `launchreel-audit` | Launch Doctor audit |
| `launchreel-moments-script` | Moments, script, judge, TTS |
| `launchreel-video-render` | Hero video, social clips, GIF |
| `launchreel-launch-copy` | X, LinkedIn, PH comment, changelog |
| `launchreel-product-hunt` | PH gallery kit + launch prep |
| `launchreel-share-demo` | Share page, demo, analytics |
| `launchreel-agent-capture` | Playwright URL capture |
| `launchreel-cloud-publish` | YouTube, credits, cloud sync |
| `launchreel-brand-localize` | Brand kit + localization |

## External skills (`.agents/skills/`)

| Skill | Installs | Use for |
|-------|----------|---------|
| copywriting | kostja94 | Headlines, landing copy |
| video-marketing | kostja94 | Video strategy, hooks |
| linkedin-posts | kostja94 | LinkedIn launch posts |
| twitter-x-posts | kostja94 | X launch posts |
| youtube-seo | kostja94 | YouTube titles, descriptions |
| producthunt | dylanfeltus | PH launch playbook |
| playwright-best-practices | currents-dev | Agent capture reliability |
| nextjs-app-router-patterns | wshobson | Next.js 16 app routes |
| clerk-nextjs-patterns | clerk | Auth + middleware |

Lock file: `skills-lock.json`

## Quality standard

All skills enforce LaunchReel's pro bar: **specific** (this product's moments), **muted-first** (social works without sound), **founder-grade** (no hype slop), **distribution-ready** (full kit in one pass).
