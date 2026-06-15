import type { Analytics, Project } from "./types";
import {
  getShareEventCounts,
  type ShareEventCounts,
} from "./share-analytics";

export type { ShareEventCounts };

/** Merge local + optional server share analytics into project metrics. */
export function analyticsWithViews(
  project: Project,
  serverCounts?: ShareEventCounts | null,
): Analytics {
  const local = getShareEventCounts(project.id);
  const views = serverCounts?.views ?? local.views;
  const plays = serverCounts?.plays ?? local.plays;
  const ctaClicks = serverCounts?.ctaClicks ?? local.ctaClicks;
  const hasRenders = Boolean(project.renders?.length);
  const hasSocial = project.assets.social.some((a) => a.blobKey);

  const bestReferrer = views > 0 ? "Direct / share link" : "—";

  return {
    metrics: [
      { label: "Share page views", value: String(views) },
      { label: "Video plays", value: String(plays) },
      { label: "CTA clicks", value: String(ctaClicks) },
      { label: "Videos rendered", value: String(project.renders?.length ?? 0) },
      { label: "Social clips", value: String(project.assets.social.filter((a) => a.blobKey).length) },
      { label: "Best referrer", value: bestReferrer },
    ],
    bestAsset:
      plays > views / 2 && hasRenders ?
        "16:9 launch video — strong play rate"
      : hasSocial ?
        "9:16 social clips — ready to post"
      : project.analytics.bestAsset,
    weakestAsset:
      ctaClicks === 0 && views > 0 ?
        "CTA — add a sharper button on the share page"
      : views === 0 ?
        "Share page — copy link and distribute"
      : project.analytics.weakestAsset,
    recommendations: [
      views === 0 ?
        "Publish your share page link on X and Product Hunt first comment."
      : `Share page has ${views} view${views === 1 ? "" : "s"} — double down on what's working.`,
      plays < views / 3 && hasRenders ?
        "Video play rate is low — try the 5s teaser GIF as the hero embed."
      : hasSocial ?
        "Post clip 2 (product magic) as a muted TikTok/Reels teaser."
      : "Generate social clips from Moments to unlock short-form distribution.",
      ctaClicks === 0 ?
        'Change your CTA to "Generate your launch kit free" for higher clicks.'
      : "Download the ZIP and ship to Product Hunt gallery.",
    ],
  };
}
