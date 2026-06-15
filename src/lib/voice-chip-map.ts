import type { RewriteMode } from "@/lib/ai";

const CHIP_MODES: Record<string, RewriteMode> = {
  "More founder-like": "founder",
  "More punchy": "punchy",
  "Less hype": "less-hype",
  "More technical": "technical",
  "More investor-ready": "technical",
  "More emotional": "founder",
  "More direct": "punchy",
};

export function voiceChipToMode(chip: string): RewriteMode {
  return CHIP_MODES[chip] ?? "founder";
}
