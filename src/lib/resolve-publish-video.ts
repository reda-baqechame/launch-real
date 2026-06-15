import type { Project } from "./types";
import { resolveTrustedBlobUrl } from "./blob-url";

export interface PublishVideoRef {
  blobKey: string | null;
  url: string | null;
  source: "cloud" | "none";
}

/** Best publishable 16:9 video URL for OAuth upload routes. */
export function resolvePublishVideo(project: Project, clerkId?: string): PublishVideoRef {
  const render =
    project.renders?.find((r) => r.aspect === "16:9") ?? project.renders?.[0];
  if (!render?.blobKey) {
    return { blobKey: null, url: null, source: "none" };
  }

  const ref = project.cloudBlobs?.[render.blobKey];
  const url = resolveTrustedBlobUrl(ref, {
    clerkId,
    projectId: project.id,
    blobKey: render.blobKey,
  });
  if (url) {
    return { blobKey: render.blobKey, url, source: "cloud" };
  }

  return { blobKey: render.blobKey, url: null, source: "none" };
}
