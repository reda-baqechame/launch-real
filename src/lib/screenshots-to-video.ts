/** Turn still images into a short Ken-Burns-style slideshow video in the browser. */

export interface SlideshowOptions {
  width?: number;
  height?: number;
  holdMs?: number;
  fps?: number;
  maxShots?: number;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
  return img.naturalWidth > 0 ? img : null;
}

async function sourceToUrl(source: string | File): Promise<string> {
  if (typeof source === "string") return source;
  return URL.createObjectURL(source);
}

export async function screenshotsToVideo(
  sources: Array<string | File>,
  opts: SlideshowOptions = {},
): Promise<Blob> {
  const {
    width = 1280,
    height = 720,
    holdMs = 1500,
    fps = 10,
    maxShots = 12,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });
  recorder.start();

  const objectUrls: string[] = [];
  try {
    for (const source of sources.slice(0, maxShots)) {
      const url = await sourceToUrl(source);
      if (source instanceof File) objectUrls.push(url);
      const img = await loadImage(url);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      if (img) {
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      }
      await new Promise((r) => setTimeout(r, holdMs));
    }
  } finally {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }

  recorder.stop();
  return done;
}
