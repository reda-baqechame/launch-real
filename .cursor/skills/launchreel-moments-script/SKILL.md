---
name: launchreel-moments-script
description: Demo moment detection, shot-list scripts, A/B hooks, and quality judge for LaunchReel videos. Use when working on analyze, script, judge, transcribe, TTS, or moment-review generation.
---

# Moments + script + judge

Also read: `.agents/skills/video-marketing` for pacing principles.

## Code

| Step | API | UI |
|------|-----|-----|
| Moments | `src/app/api/analyze/route.ts` | `moment-review.tsx` |
| Script A/B | `src/app/api/script/route.ts` | `moment-review.tsx` |
| Judge | `src/app/api/judge/route.ts` | Video tab scores |
| Transcribe | `src/app/api/transcribe/route.ts` | `/new` optional |
| TTS | `src/app/api/tts/route.ts` | generation step 3 |

## Demo Director (moments)

- 3–6 moments, ordered by `wow_score`
- Roles: Problem setup, Magic moment, Feature reveal, Proof, Payoff, CTA
- `keepByDefault = true` when `wow_score >= 60`
- `startSec`/`endSec` must match frame timestamps

## Script writer

- Voiceover lines timed to kept moments
- Modes: marketing / explainer / tutorial (`outputMode`)
- Hook in first 3 seconds of script
- CTA concrete: "Try X free" not "Learn more"

## Quality judge

- Pass threshold: total >= 75
- Score honestly on hook, clarity, pacing, caption legibility
- Losing variant still saved as A/B preview blobs

## Generation flow (`moment-review.tsx`)

1. Script A/B → proxy renders → judge → winner
2. Full render 16:9 + 9:16 + 1:1
3. Teaser GIF, founder/investor cuts (v5/v6), social clips
4. PH kit + captions (+ changelog copy if `sourceChangelog`)

Respect `shouldWatermark(credits)` on all renders.

## Checklist

- [ ] At least one Magic moment or Feature reveal kept
- [ ] Script lines map 1:1 to `shotList` moment IDs
- [ ] Judge runs before full render when Anthropic key present
