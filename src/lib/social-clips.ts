import type { DemoMoment, StoryRole } from "./types";

export interface SocialClipPlan {
  id: string;
  label: string;
  platform: string;
  moment: DemoMoment;
  hookText: string;
}

const CLIP_SLOTS: {
  id: string;
  label: string;
  platform: string;
  roles: StoryRole[];
}[] = [
  { id: "soc-1", label: "Problem hook", platform: "X / LinkedIn", roles: ["Problem setup", "Before"] },
  { id: "soc-2", label: "Product magic", platform: "TikTok / Reels", roles: ["Magic moment", "Feature reveal", "Proof"] },
  { id: "soc-3", label: "CTA", platform: "Follow-up post", roles: ["CTA", "Payoff"] },
];

function scoreMoment(m: DemoMoment): number {
  return (m.wowScore ?? 50) + (m.keepByDefault ? 10 : 0);
}

function pickForRole(moments: DemoMoment[], roles: StoryRole[], used: Set<string>): DemoMoment | undefined {
  for (const role of roles) {
    const match = moments
      .filter((m) => !used.has(m.id) && m.role === role)
      .sort((a, b) => scoreMoment(b) - scoreMoment(a))[0];
    if (match) return match;
  }
  return moments
    .filter((m) => !used.has(m.id))
    .sort((a, b) => scoreMoment(b) - scoreMoment(a))[0];
}

/** Pick three distinct moments for vertical social clips. */
export function planSocialClips(
  moments: DemoMoment[],
  hook: string,
  cta: string,
): SocialClipPlan[] {
  const pool = moments.length > 0 ? moments : [];
  const used = new Set<string>();
  const hooks = [hook, pool[1]?.title ?? hook, cta];

  return CLIP_SLOTS.map((slot, i) => {
    const moment =
      pickForRole(pool, slot.roles, used) ??
      pool[i] ??
      pool[pool.length - 1] ??
      ({
        id: `fallback-${i}`,
        timecode: "00:00",
        title: slot.label,
        role: slot.roles[0],
        why: "",
        keepByDefault: true,
        startSec: i * 6,
        endSec: (i + 1) * 6,
      } satisfies DemoMoment);

    used.add(moment.id);

    return {
      id: slot.id,
      label: slot.label,
      platform: slot.platform,
      moment,
      hookText: i === 2 ? cta : hooks[i] ?? moment.title,
    };
  });
}

export function clipDurationSec(moment: DemoMoment): number {
  const natural = (moment.endSec ?? (moment.startSec ?? 0) + 5) - (moment.startSec ?? 0);
  return Math.max(4, Math.min(10, natural || 6));
}
