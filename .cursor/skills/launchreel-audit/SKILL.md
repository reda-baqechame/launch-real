---
name: launchreel-audit
description: Launch Doctor audit for LaunchReel — brutal honest product launch scoring, hooks, and angles. Use when working on /audit, /api/audit, launch strategy, hooks, one-liners, or Launch Doctor prompts.
---

# Launch Doctor (audit)

Also read: `.agents/skills/copywriting` for headline craft.

## Code

- API: `src/app/api/audit/route.ts` — system prompt + `AUDIT_SCHEMA`
- UI: `src/app/(app)/projects/[id]/audit/page.tsx`
- Types: `AiAudit` in `src/lib/types.ts`

## Quality bar

- Stranger understands product and cares in **5 seconds**
- 8 breakdown dimensions exactly: Clarity, Pain intensity, Differentiation, Demo strength, Proof, Launch readiness, Visual quality, CTA strength
- Scores 0–100 with real variance — no clustering at 80
- Criticism: 2–4 bullets **specific to this product**, never boilerplate
- Hooks: under 10 words, founder-grade, zero hype slop

## When editing prompts

- Preserve JSON schema constraints (`output_config.format`)
- Model: `claude-opus-4-8` (match existing routes)
- BYO key via `x-anthropic-key` header — never log keys

## Output examples (good vs bad)

**Good hook:** "Your demo is great. Your launch video isn't."

**Bad hook:** "Revolutionary AI-powered solution transforming the industry."

## Checklist

- [ ] `recommendedHook` and `mainHook` differ in angle
- [ ] `bestDemoMoment` names a concrete UI action
- [ ] `refinedOneLiner` passes the 5-second stranger test
