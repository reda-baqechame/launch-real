/** Free / local renders include LaunchReel watermark; paid cloud credits remove it. */
export function shouldWatermark(credits: { enabled: boolean; credits: number | null }): boolean {
  if (!credits.enabled) return true;
  return (credits.credits ?? 0) <= 0;
}
