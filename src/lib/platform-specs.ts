import type { AspectRatio } from "./director";

/** Output presets tuned to each platform's preferred aspect + length. */
export interface PlatformSpec {
  id: string;
  label: string;
  aspect: AspectRatio;
  maxDurationSec: number;
  momentLimit?: number;
}

export const PLATFORM_SPECS: PlatformSpec[] = [
  { id: "linkedin", label: "LinkedIn", aspect: "1:1", maxDurationSec: 90 },
  { id: "x", label: "X / Twitter", aspect: "16:9", maxDurationSec: 140 },
  { id: "tiktok", label: "TikTok", aspect: "9:16", maxDurationSec: 60, momentLimit: 3 },
  { id: "shorts", label: "YouTube Shorts", aspect: "9:16", maxDurationSec: 60, momentLimit: 3 },
  { id: "reels", label: "Instagram Reels", aspect: "9:16", maxDurationSec: 90, momentLimit: 4 },
  { id: "youtube", label: "YouTube (16:9)", aspect: "16:9", maxDurationSec: 600 },
];
