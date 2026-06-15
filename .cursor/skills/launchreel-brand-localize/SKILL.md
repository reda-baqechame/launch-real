---
name: launchreel-brand-localize
description: LaunchReel brand kit and localization — colors, voice, watermark, market adaptation. Use when working on /brand, brand-kit-store, localize tab, or /api/localize.
---

# Brand kit + localize

## Code

- Brand editor: `src/app/(app)/brand/page.tsx`, `brand-kit-editor.tsx`
- Store: `src/lib/brand-kit-store.ts` — localStorage `launchreel.brand-kit.v1`
- Localize: `src/components/localize-tab.tsx`, `POST /api/localize`
- Used in renders: `product-video.tsx` reads `useBrandKit()`

## Brand kit fields

- Colors: primary, accent, background — ensure caption contrast on footage
- Voice mode: Founder / Marketer / Technical / Investor
- CTA + end card text
- `localizedLanguages[]` updated when user localizes

## Localize (not literal translation)

- Adapt hook, one-liner, CTA, X post for locale + style chip
- Styles: Native founder, Formal business, Punchy social, Investor-ready
- Persist `defaultLanguage` and append to `localizedLanguages`

## Checklist

- [ ] Primary color passes WCAG on white and dark UI in demo footage
- [ ] Watermark policy independent of brand kit (credits gate end card)
