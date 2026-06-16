---
name: launchreel-launch-copy
description: LaunchReel launch copy — X, LinkedIn, PH first comment, voice rewrite, changelog assets, landing page kit. Use when working on captions, rewrite, localize, changelog-kit, or Copy tab.
---

# Launch copy

Also read: **`launchreel-quality-constitution`**, `.agents/skills/copywriting`, `twitter-x-posts`, `linkedin-posts`.

## Code

- Captions API: `src/app/api/captions/route.ts`
- Rewrite: `src/app/api/rewrite/route.ts` + `voice-chip-map.ts`
- Changelog: `src/lib/changelog-kit.ts` + `project.sourceChangelog`
- UI: `launch-kit-tabs.tsx` Copy tab, `VoiceChips`, `RegeneratePanel`

## Limits (API)

- X: under 280 chars
- LinkedIn: 2–3 sentences, line breaks OK
- PH first comment: helpful, not spammy — invite questions
- Social clip captions: under 200 chars, works **muted**

## Voice chips → rewrite modes

| Chip | Mode |
|------|------|
| More founder-like | `founder` |
| More punchy | `punchy` |
| Less hype | `less-hype` |
| More investor-ready | `technical` |

## Changelog intake

When user pastes PRD/changelog at `/new`, `generate.ts` stores `sourceChangelog`. After kit generation, append:

- Changelog → launch post
- Changelog email
- Changelog X post

## Pro copy principles

Prompts: `CAPTIONS_SYSTEM`, `REWRITE_MODE_GUIDES` in `src/lib/ai-prompts.ts`.

- Lead with **outcome**, not features list
- One idea per sentence
- CTA names the product action ("Generate your kit free")
- Enforce `BANNED_PHRASES` — see quality constitution

## Checklist

- [ ] X post stands alone without video context
- [ ] PH comment adds value (tip, story, or offer to answer)
- [ ] Regenerate copy preserves `blobKey` on social assets
