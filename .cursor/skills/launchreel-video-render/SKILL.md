---
name: launchreel-video-render
description: LaunchReel video compositor — hero renders, social clips, teaser GIF, founder/investor cuts, captions, watermark policy. Use when working on product-video, social-clip-render, Ken-Burns, or render quality.
---

# Video render engine

Also read: `.agents/skills/video-marketing`.

## Code

- Compositor: `src/components/product-video.tsx` — canvas shot-list, captions, outro
- Social: `src/lib/social-clip-render.ts` — 3× 9:16 clips
- GIF: `src/lib/teaser-gif.ts`
- Storage: `src/lib/footage-store.ts` — IndexedDB blob keys
- Watermark: `src/lib/watermark-policy.ts` — off when cloud credits > 0

## Aspect outputs

| ID | Aspect | Use |
|----|--------|-----|
| v1 | 16:9 | PH / YouTube hero |
| v2 | 9:16 | TikTok / Reels |
| v3 | 1:1 | LinkedIn / X |
| v4 | 5s GIF | Email / README autoplay |
| v5 | 16:9 | Founder hook cut |
| v6 | 16:9 | Investor hook cut |

## Pro render rules

- **Muted-first:** hook card + captions readable at phone size
- **Auto-zoom** on click hotspots when `footage.clicks` present
- **Ken-Burns** for screenshot path — no black bars
- **Music:** `createAmbientPad()` fallback if `/music/bed.mp3` missing
- **Duration:** hero ~45–60s; social clips 12–18s; GIF 5s
- **Proxy A/B:** max 18s, lower cost preview before full render

## Social clip structure

1. Problem hook card (3s)
2. Strongest moment cut
3. CTA end card with brand colors

## Checklist

- [ ] Captions contrast passes on light and dark UI footage
- [ ] End card CTA matches `brandKit.cta` or script CTA
- [ ] `URL.revokeObjectURL` after blob work in async flows
