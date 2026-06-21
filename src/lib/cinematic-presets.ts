import type { BrandKit, SeedanceMode } from "./types";

/**
 * Cinematic Motion Presets — the curated, opinionated shot library that makes
 * LaunchReel feel like a director, not a generic text-to-video box. Each preset
 * encodes a named camera move (crash zoom, dolly, orbit…) plus where it belongs
 * in a launch edit. Kept small and high-quality on purpose; quality over count.
 *
 * `buildPrompt` produces the Seedance prompt, woven with the project's real
 * brand (palette, voice) and subject so shots come out on-brand, not stock.
 */

export type ShotPlacement = "intro" | "broll" | "transition" | "outro";

export interface CinematicPreset {
  id: string;
  label: string;
  /** One-line pitch shown in the UI. */
  useCase: string;
  mode: SeedanceMode;
  placement: ShotPlacement;
  durationSec: number;
  recommendedAspect: ("16:9" | "9:16" | "1:1")[];
  /** Camera / motion hints sent alongside the prompt. */
  camera: string;
  /** Build the final Seedance prompt for this shot. */
  buildPrompt: (ctx: ShotContext) => string;
}

export interface ShotContext {
  /** Product name or the thing the shot is about. */
  subject: string;
  brand: BrandKit;
  /** Extra art direction from the angle/hook, optional. */
  note?: string;
}

function palette(brand: BrandKit): string {
  return `brand palette ${brand.primaryColor} and ${brand.accentColor} on ${brand.backgroundColor}, clean modern software aesthetic`;
}

function base(ctx: ShotContext, body: string): string {
  const note = ctx.note?.trim() ? ` ${ctx.note.trim()}.` : "";
  return `${body} ${palette(ctx.brand)}. Cinematic, sharp, premium product-launch look, no text artifacts, no watermark, smooth motion.${note}`;
}

export const CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    id: "crash-zoom-reveal",
    label: "Crash Zoom Reveal",
    useCase: "Punchy intro that slams into your product's hero screen.",
    mode: "image-to-video",
    placement: "intro",
    durationSec: 3,
    recommendedAspect: ["16:9", "9:16", "1:1"],
    camera: "fast crash zoom in, slight motion blur, settle on subject",
    buildPrompt: (ctx) =>
      base(ctx, `Fast crash-zoom reveal pushing into ${ctx.subject} on a sleek device screen.`),
  },
  {
    id: "dolly-in-hero",
    label: "Dolly-In Hero",
    useCase: "Confident, slow push toward the product — the establishing shot.",
    mode: "image-to-video",
    placement: "intro",
    durationSec: 4,
    recommendedAspect: ["16:9"],
    camera: "slow cinematic dolly-in, shallow depth of field",
    buildPrompt: (ctx) =>
      base(ctx, `Slow cinematic dolly-in toward ${ctx.subject} floating in a minimal studio space, soft key light.`),
  },
  {
    id: "glossy-product-float",
    label: "Glossy Product Float",
    useCase: "Apple-style floating device with soft reflections. Premium b-roll.",
    mode: "image-to-video",
    placement: "broll",
    durationSec: 4,
    recommendedAspect: ["16:9", "1:1"],
    camera: "gentle parallax float, subtle rotation, glossy reflections",
    buildPrompt: (ctx) =>
      base(ctx, `${ctx.subject} on a device gently floating and rotating with glossy reflections on a seamless backdrop.`),
  },
  {
    id: "bullet-time-orbit",
    label: "Bullet-Time Orbit",
    useCase: "Dramatic 180° orbit around the product. The wow b-roll.",
    mode: "image-to-video",
    placement: "broll",
    durationSec: 4,
    recommendedAspect: ["16:9", "9:16"],
    camera: "bullet-time orbit, frozen subject, sweeping camera",
    buildPrompt: (ctx) =>
      base(ctx, `Bullet-time orbit sweeping 180 degrees around ${ctx.subject} on a device, dramatic rim light.`),
  },
  {
    id: "fpv-flythrough",
    label: "FPV Flythrough",
    useCase: "Energetic drone-style fly-through for fast-paced ads.",
    mode: "text-to-video",
    placement: "broll",
    durationSec: 3,
    recommendedAspect: ["9:16", "16:9"],
    camera: "FPV drone fly-through, fast forward motion, dynamic",
    buildPrompt: (ctx) =>
      base(ctx, `Energetic FPV drone fly-through of an abstract tech environment evoking ${ctx.subject}, speed and momentum.`),
  },
  {
    id: "parallax-stack",
    label: "Parallax Stack",
    useCase: "Floating UI cards in parallax layers — explains structure.",
    mode: "image-to-video",
    placement: "broll",
    durationSec: 4,
    recommendedAspect: ["16:9"],
    camera: "multi-layer parallax, cards drifting at different depths",
    buildPrompt: (ctx) =>
      base(ctx, `Floating UI cards from ${ctx.subject} drifting in layered parallax depth, soft shadows.`),
  },
  {
    id: "match-cut-transition",
    label: "Match-Cut Transition",
    useCase: "Seamless motion bridge between two product moments.",
    mode: "image-to-video",
    placement: "transition",
    durationSec: 2,
    recommendedAspect: ["16:9", "9:16", "1:1"],
    camera: "morph match-cut, continuous motion between two frames",
    buildPrompt: (ctx) =>
      base(ctx, `Seamless match-cut morph transitioning between two moments of ${ctx.subject}.`),
  },
  {
    id: "brand-outro-sting",
    label: "Brand Outro Sting",
    useCase: "Clean logo/CTA endcard with a confident settle.",
    mode: "text-to-video",
    placement: "outro",
    durationSec: 3,
    recommendedAspect: ["16:9", "9:16", "1:1"],
    camera: "subtle push-in settle, soft particles",
    buildPrompt: (ctx) =>
      base(ctx, `Minimal brand outro sting for ${ctx.brand.logoText || ctx.subject}, soft light particles, confident settle, space for a logo and CTA.`),
  },
];

export function getPreset(id: string): CinematicPreset | undefined {
  return CINEMATIC_PRESETS.find((p) => p.id === id);
}
