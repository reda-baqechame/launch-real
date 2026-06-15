import type { Analytics, Project } from "./types";

const VIEW_KEY = "launchreel.share_views";

export function getShareViews(projectId: string): number {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const views = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return views[projectId] ?? 0;
  } catch {
    return 0;
  }
}

/** Merge real local + optional server share views into project analytics. */
export function analyticsWithViews(project: Project, serverViews?: number | null): Analytics {
  const localViews = getShareViews(project.id);
  const views = serverViews ?? localViews;
  const hasRenders = Boolean(project.renders?.length);
  const hasSocial = project.assets.social.some((a) => a.blobKey);

  return {
    metrics: [
      { label: "Share page views", value: String(views) },
      { label: "Videos rendered", value: String(project.renders?.length ?? 0) },
      { label: "Social clips", value: String(project.assets.social.filter((a) => a.blobKey).length) },
    ],
    bestAsset:
      views > 0 && hasRenders ?
        "16:9 launch video — getting share traffic"
      : hasSocial ?
        "9:16 social clips — ready to post"
      : project.analytics.bestAsset,
    weakestAsset: views === 0 ? "Share page — copy link and distribute" : project.analytics.weakestAsset,
    recommendations: [
      views === 0 ? "Publish your share page link on X and Product Hunt first comment." : `Share page has ${views} view${views === 1 ? "" : "s"} — double down on what's working.`,
      hasSocial ? "Post clip 2 (product magic) as a muted TikTok/Reels teaser." : "Generate social clips from Moments to unlock short-form distribution.",
      project.judge && !project.judge.pass ? "Re-render with the alternate hook from A/B previews." : "Download the ZIP and ship to Product Hunt gallery.",
    ],
  };
}
