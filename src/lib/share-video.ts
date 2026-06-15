import { getBlobUrl } from "./footage-store";
import { isImageDataUrl } from "./download-utils";
import type { Project } from "./types";

export type ShareMediaKind = "render" | "social" | "footage" | "poster";

export interface ShareMedia {
  url: string;
  kind: ShareMediaKind;
}

/** Best available video for the public share page. */
export async function resolveShareVideo(project: Project): Promise<ShareMedia | null> {
  const render =
    project.renders?.find((r) => r.aspect === "16:9") ?? project.renders?.[0];
  if (render?.blobKey) {
    const cloudUrl = project.cloudBlobs?.[render.blobKey]?.url;
    if (cloudUrl) return { url: cloudUrl, kind: "render" };
    const url = await getBlobUrl(render.blobKey, "render");
    if (url) return { url, kind: "render" };
  }

  for (const clip of project.assets.social) {
    if (!clip.blobKey) continue;
    const cloudUrl = project.cloudBlobs?.[clip.blobKey]?.url;
    if (cloudUrl) return { url: cloudUrl, kind: "social" };
    const url = await getBlobUrl(clip.blobKey, "render");
    if (url) return { url, kind: "social" };
  }

  if (project.footage?.blobKey) {
    const cloudUrl = project.cloudBlobs?.[project.footage.blobKey]?.url;
    if (cloudUrl) return { url: cloudUrl, kind: "footage" };
    const url = await getBlobUrl(project.footage.blobKey, "footage");
    if (url) return { url, kind: "footage" };
  }

  return null;
}

export function findSharePoster(project: Project): string | null {
  const poster = project.assets.productHunt.find(
    (a) => a.id === "ph-poster" && isImageDataUrl(a.body),
  );
  return poster?.body ?? null;
}
