import { cn } from "@/lib/cn";
import {
  footageBadge,
  mediaBadgeToneClass,
  renderBadge,
  type MediaBadge,
} from "@/lib/project-media-status";
import type { Project } from "@/lib/types";

function MediaBadgeChip({ badge }: { badge: MediaBadge }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        mediaBadgeToneClass[badge.tone],
      )}
    >
      {badge.label}
    </span>
  );
}

export function ProjectMediaBadges({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <MediaBadgeChip badge={footageBadge(project)} />
      <MediaBadgeChip badge={renderBadge(project)} />
    </div>
  );
}
