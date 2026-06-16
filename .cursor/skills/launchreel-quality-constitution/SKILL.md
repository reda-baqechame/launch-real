---
name: launchreel-quality-constitution
description: LaunchReel quality constitution — banned phrases, giant benchmarks (Loom, Descript, Canva, Product Hunt), muted-first bar, and prompt edit rules. Use before changing any AI prompt, copy template, or launch asset in LaunchReel.
---

# LaunchReel quality constitution

**Single source of truth for prompts:** `src/lib/ai-prompts.ts`  
Never scatter system strings in API routes — edit the library, import in routes.

## Giant benchmark (what we beat)

| Competitor | They win on | LaunchReel must win on |
|------------|-------------|------------------------|
| **Loom** | Fast screen capture | Same speed + **launch-ready kit** (script, clips, copy) from one recording |
| **Descript** | Edit + captions | **Founder launch narrative** — not podcast polish, Product Hunt gallery clarity |
| **Canva** | Templates | **Product-specific moments** — real UI, real hooks, not stock motion graphics |
| **Top PH launches** | Gallery video stops scroll in 3s | Muted autoplay tells full story: pain → magic → CTA |

If output could apply to any SaaS, it fails.

## The 5-second stranger test

Every hook, one-liner, first frame, and X post line 1 must answer:

1. **What** is this? (concrete noun — not "platform" or "solution")
2. **For whom**? (specific user type or job)
3. **Why care now**? (pain, cost of status quo, or visible wow)

Read aloud: hook under 3 seconds. Muted viewer still gets the story from on-screen text + visuals.

## Banned phrases (instant rewrite)

From `BANNED_PHRASES` in `src/lib/ai-prompts.ts` — includes:

game-changer, revolutionary, disruptive, synergy, leverage, unlock, empower, seamless, robust, innovative solution, best-in-class, streamline your workflow, all-in-one platform, excited to announce, we're thrilled…

**Replace with:** named UI element, user role, metric, or before/after state.

## Good vs bad (copy)

| Bad (generic) | Good (giant-tier) |
|---------------|-------------------|
| "Revolutionary AI platform transforming workflows" | "Turn your Loom into a Product Hunt video in one take" |
| "Seamless integration for modern teams" | "Connect Stripe once — launch kit pulls your last 3 releases" |
| "We're excited to announce our launch!" | "We built this because our demo got 40 upvotes but zero signups" |
| "Learn more" | "Generate your kit free — no card" |

## Good vs bad (video moments)

| Bad | Good |
|-----|------|
| 30s of login + empty dashboard | Open on the **magic moment** — chart populating, export finishing |
| Settings page tour | One workflow: problem screen → click → payoff |
| Generic zoom on logo | Zoom on the button label that changes the outcome |

## Quality gates (numeric)

- **Judge pass:** total ≥ 75 (`JUDGE_SYSTEM`) — hook and clarity weighted for winner
- **Moment keep:** `wow_score >= 60` for default keep
- **Audit scores:** real variance 0–100 — never cluster 75–85 on everything
- **API self-check:** append `QUALITY_SELF_CHECK` to user messages where routes already do

## When editing prompts

1. Change `src/lib/ai-prompts.ts` only
2. Keep JSON schemas in route files unchanged unless product requires new fields
3. Model: `claude-opus-4-8` on intelligence routes (match existing)
4. BYO keys via headers — never log keys
5. Run `npm run verify` after prompt changes

## Agent checklist (every AI touchpoint)

- [ ] Names THIS product, not "your product"
- [ ] Hook works as PH gallery first frame
- [ ] No banned phrases
- [ ] Muted social clip still understandable
- [ ] CTA is one concrete action
- [ ] Criticism/judge notes are specific fixes, not praise
