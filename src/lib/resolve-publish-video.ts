import type { Project } from "./types";

export interface PublishVideoRef {
  blobKey: string | null;
  url: string | null;
  source: "cloud" | "none";
}

/** Best publishable 16:9 video URL for OAuth upload routes. */
export function resolvePublishVideo(project: Project): PublishVideoRef {
  const render =
    project.renders?.find((r) => r.aspect === "16:9") ?? project.renders?.[0];
  if (!render?.blobKey) {
    return { blobKey: null, url: null, source: "none" };
  }

  const cloudUrl = project.cloudBlobs?.[render.blobKey]?.url ?? null;
  if (cloudUrl) {
    return { blobKey: render.blobKey, url: cloudUrl, source: "cloud" };
  }

  return { blobKey: render.blobKey, url: null, source: "none" };
}
