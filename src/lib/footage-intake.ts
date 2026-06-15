import { footageKey, saveBlob } from "./footage-store";
import { screenshotsToVideo } from "./screenshots-to-video";
import type { FootageMeta } from "./types";

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(webm|mp4|mov|m4v|mkv)$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export async function probeVideoBlob(blob: Blob): Promise<{ durationSec: number; hasAudio: boolean }> {
  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = false;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video file."));
    });
    const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
    const media = video as HTMLVideoElement & {
      mozHasAudio?: boolean;
      audioTracks?: { length: number };
    };
    const hasAudio = Boolean(media.mozHasAudio) || (media.audioTracks?.length ?? 0) > 0;
    return { durationSec, hasAudio };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function saveRecordingFootage(
  projectId: string,
  file: File,
): Promise<{ meta: FootageMeta; blob: Blob }> {
  const blob = file;
  const { durationSec, hasAudio } = await probeVideoBlob(blob);
  const blobKey = footageKey(projectId);
  await saveBlob(blobKey, projectId, blob, "footage");
  return {
    blob,
    meta: {
      projectId,
      kind: "recording",
      durationSec,
      hasAudio,
      clickCount: 0,
      blobKey,
    },
  };
}

export async function saveScreenshotFootage(
  projectId: string,
  files: File[],
): Promise<{ meta: FootageMeta; blob: Blob }> {
  const images = files.filter(isImageFile);
  if (images.length === 0) {
    throw new Error("Add at least one image file (PNG, JPG, or WebP).");
  }

  const screenshotKeys: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const key = `screenshot:${projectId}:${i}`;
    screenshotKeys.push(key);
    await saveBlob(key, projectId, images[i], "screenshot");
  }

  const blob = await screenshotsToVideo(images);
  const blobKey = footageKey(projectId);
  await saveBlob(blobKey, projectId, blob, "footage");
  const durationSec = (images.length * 1.5);

  return {
    blob,
    meta: {
      projectId,
      kind: "screenshots",
      durationSec,
      hasAudio: false,
      clickCount: 0,
      blobKey,
      screenshotKeys,
    },
  };
}
