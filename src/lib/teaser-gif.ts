import { GIFEncoder, applyPalette, quantize } from "gifenc";

export interface TeaserGifOptions {
  durationSec?: number;
  fps?: number;
  width?: number;
}

/** Encode the first N seconds of a video as a muted autoplay GIF. */
export async function renderTeaserGif(
  videoUrl: string,
  opts: TeaserGifOptions = {},
): Promise<Blob> {
  const durationSec = opts.durationSec ?? 5;
  const fps = opts.fps ?? 8;
  const width = opts.width ?? 480;

  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video for GIF."));
  });

  const clipDuration = Math.min(durationSec, video.duration || durationSec);
  const frameCount = Math.max(1, Math.round(clipDuration * fps));
  const delayCs = Math.round(100 / fps);
  const height = Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const gif = GIFEncoder();
  let palette: ReturnType<typeof quantize> | undefined;

  for (let i = 0; i < frameCount; i++) {
    const t = (clipDuration * i) / Math.max(1, frameCount - 1);
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    if (!palette) palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: delayCs });
  }

  gif.finish();
  return new Blob([new Uint8Array(gif.bytes())], { type: "image/gif" });
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Video seek failed."));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = Math.min(timeSec, Math.max(0, video.duration - 0.05));
    if (Math.abs(video.currentTime - timeSec) < 0.01 && video.readyState >= 2) {
      onSeeked();
    }
  });
}
