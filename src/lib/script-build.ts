import type { DemoMoment, ShotListItem, VideoScript } from "./types";
import { DEFAULT_BRAND_KIT } from "./mock-data";

/** Build a script + shot_list from selected moments for the edit engine. */
export function buildScriptFromMoments(
  moments: DemoMoment[],
  hook: string,
  cta = DEFAULT_BRAND_KIT.cta,
): VideoScript {
  let t = 2;
  const lines: VideoScript["lines"] = [];
  const shotList: ShotListItem[] = [];

  for (const m of moments) {
    const dur = Math.max(
      2.5,
      Math.min(6, (m.endSec ?? (m.startSec ?? 0) + 4) - (m.startSec ?? 0)),
    );
    lines.push({ text: m.title, startSec: t, endSec: t + dur });
    shotList.push({ momentId: m.id, durationSec: dur });
    t += dur;
  }

  return { hook, cta, lines, shotList };
}
