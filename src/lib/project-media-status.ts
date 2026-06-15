import type { Project } from "@/lib/types";

export type MediaBadgeTone = "good" | "accent" | "warn" | "mute";

export interface MediaBadge {
  label: string;
  tone: MediaBadgeTone;
}

const FOOTAGE_KIND_LABEL: Record<NonNullable<Project["footage"]>["kind"], string> = {
  recording: "Recording",
  screenshots: "Screenshots",
  agent: "Agent capture",
};

/** Footage intake status for library / dashboard chips. */
export function footageBadge(project: Project): MediaBadge {
  const footage = project.footage;
  if (!footage?.blobKey) {
    return { label: "No footage", tone: "mute" };
  }
  return {
    label: FOOTAGE_KIND_LABEL[footage.kind] ?? "Footage",
    tone: "good",
  };
}

/** Render / kit output status for library / dashboard chips. */
export function renderBadge(project: Project): MediaBadge {
  const renderCount =
    project.renders?.filter((r) => r.blobKey).length ?? 0;
  const renderedVideos = project.assets.videos.filter((a) => a.blobKey).length;
  const renderedSocial = project.assets.social.filter((a) => a.blobKey).length;

  if (renderCount > 0) {
    return {
      label: `${renderCount} render${renderCount === 1 ? "" : "s"}`,
      tone: "good",
    };
  }
  if (renderedVideos > 0 || renderedSocial > 0) {
    return { label: "Partial kit", tone: "accent" };
  }
  if (project.moments.length > 0) {
    return { label: "Not rendered", tone: "warn" };
  }
  return { label: "Not generated", tone: "mute" };
}

export const mediaBadgeToneClass: Record<MediaBadgeTone, string> = {
  good: "text-good border-good/30 bg-good/10",
  accent: "text-accent-ink border-accent/30 bg-accent/10",
  warn: "text-warn border-warn/30 bg-warn/10",
  mute: "text-ink-mute border-line bg-surface-2",
};
