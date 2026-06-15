/** Shared request payload limits for production API routes. */

export const LIMITS = {
  ttsTextChars: 4_000,
  transcribeBytes: 25 * 1024 * 1024,
  analyzeFrames: 12,
  analyzeFrameBase64Chars: 500_000,
  phDraftHtmlChars: 2_000_000,
  syncProjectsBatch: 50,
  renderAspects: ["16:9", "9:16", "1:1"] as const,
} as const;

export function trimText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function isAllowedRenderAspect(value: string): boolean {
  return (LIMITS.renderAspects as readonly string[]).includes(value);
}
