"use client";

import { renderProductVideo, type CinematicClipInput } from "@/components/product-video";
import type { AspectRatio } from "@/lib/director";
import type { BrandKit, ClickEvent, DeliverableCut, DemoMoment, VideoScript } from "@/lib/types";

/**
 * Three flagship deliverables from one project: a hero launch video, a vertical
 * ad cutdown, and a calm pitch cut. Each reuses the same footage + script and
 * the project's cinematic shots, varying aspect, length, and which shots wrap
 * the body.
 */
export interface DeliverableCutConfig {
  cut: DeliverableCut;
  label: string;
  aspect: AspectRatio;
  /** Which cinematic placements to weave in for this cut. */
  placements: ("intro" | "outro")[];
  momentLimit?: number;
  maxDurationSec: number;
}

export const DELIVERABLE_CUTS: DeliverableCutConfig[] = [
  {
    cut: "hero",
    label: "Hero launch video",
    aspect: "16:9",
    placements: ["intro", "outro"],
    maxDurationSec: 80,
  },
  {
    cut: "ads",
    label: "Vertical ad",
    aspect: "9:16",
    placements: ["intro", "outro"],
    momentLimit: 2,
    maxDurationSec: 20,
  },
  {
    cut: "pitch",
    label: "Pitch cut",
    aspect: "16:9",
    placements: ["outro"],
    maxDurationSec: 90,
  },
];

export interface DeliverableInputs {
  footageUrl: string;
  clicks?: ClickEvent[];
  script: VideoScript;
  moments: DemoMoment[];
  brand: BrandKit;
  imageUrls?: string[];
  narrationUrl?: string | null;
  cinematicClips: CinematicClipInput[];
  avatarClipUrl?: string;
  watermark: boolean;
  proxy?: boolean;
}

export interface DeliverableResult {
  cut: DeliverableCut;
  label: string;
  aspect: AspectRatio;
  blob: Blob;
  ext: string;
}

function clipsForCut(
  cfg: DeliverableCutConfig,
  clips: CinematicClipInput[],
): CinematicClipInput[] {
  return clips.filter((c) => {
    if (c.placement === "intro") return cfg.placements.includes("intro");
    if (c.placement === "outro") return cfg.placements.includes("outro");
    // broll / transition reused as an intro accent when intro is allowed.
    return cfg.placements.includes("intro");
  });
}

/** Render all three deliverable cuts sequentially. */
export async function renderDeliverables(
  inputs: DeliverableInputs,
  onProgress?: (cut: DeliverableCut, pct: number) => void,
): Promise<DeliverableResult[]> {
  const results: DeliverableResult[] = [];
  for (const cfg of DELIVERABLE_CUTS) {
    const out = await renderProductVideo({
      footageUrl: inputs.footageUrl,
      clicks: inputs.clicks,
      script: inputs.script,
      moments: inputs.moments,
      brand: inputs.brand,
      aspects: [cfg.aspect],
      imageUrls: inputs.imageUrls,
      narrationUrl: inputs.narrationUrl,
      watermark: inputs.watermark,
      proxy: inputs.proxy,
      momentLimit: cfg.momentLimit,
      maxDurationSec: cfg.maxDurationSec,
      cinematicClips: clipsForCut(cfg, inputs.cinematicClips),
      avatarClipUrl: inputs.avatarClipUrl,
      onProgress: (pct) => onProgress?.(cfg.cut, pct),
    });
    if (out[0]) {
      results.push({
        cut: cfg.cut,
        label: cfg.label,
        aspect: cfg.aspect,
        blob: out[0].blob,
        ext: out[0].ext,
      });
    }
  }
  return results;
}
