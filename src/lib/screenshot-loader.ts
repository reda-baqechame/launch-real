import { getBlobUrl } from "./footage-store";

export async function loadScreenshotUrls(keys: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const key of keys) {
    const url = await getBlobUrl(key, "screenshot");
    if (url) urls.push(url);
  }
  return urls;
}

export async function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
  const images: HTMLImageElement[] = [];
  for (const url of urls) {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
    if (img.naturalWidth > 0) images.push(img);
  }
  return images;
}

/** Convert a blob/object URL into a data URL for canvas / download use. */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not read image.");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not encode image."));
    reader.readAsDataURL(blob);
  });
}

export function momentsFromScreenshots(keys: string[]): import("./types").DemoMoment[] {
  return keys.map((_, i) => ({
    id: `ss-${i}`,
    timecode: `00:${String(i * 5).padStart(2, "0")}`,
    title: `Screenshot ${i + 1}`,
    role: i === 0 ? "Problem setup" as const : i === keys.length - 1 ? "CTA" as const : "Feature reveal" as const,
    why: "Uploaded product screenshot — strong visual for a launch cut.",
    keepByDefault: true,
    startSec: i * 5,
    endSec: (i + 1) * 5,
    wowScore: 70 + (i % 3) * 5,
  }));
}
