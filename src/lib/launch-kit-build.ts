import { urlToDataUrl } from "./screenshot-loader";
import type { DemoMoment, LaunchAsset, Project } from "./types";
import { grabFrame } from "./director";
import { getBrandKit } from "./brand-kit-store";

export interface LaunchKitBuildResult {
  productHunt: LaunchAsset[];
  social: LaunchAsset[];
  screenshots: { dataUrl: string; title: string }[];
}

/** Extract PH assets from footage + moments using canvas grabs. */
export async function buildLaunchKitAssets(
  footageUrl: string,
  project: Project,
  moments: DemoMoment[],
  opts?: { imageUrls?: string[] },
): Promise<LaunchKitBuildResult> {
  const kept = moments.filter((m) => m.keepByDefault).slice(0, 5);
  const screenshots: { dataUrl: string; title: string }[] = [];

  if (opts?.imageUrls?.length) {
    for (let i = 0; i < Math.min(5, opts.imageUrls.length); i++) {
      screenshots.push({
        dataUrl: await urlToDataUrl(opts.imageUrls[i]),
        title: kept[i]?.title ?? `Gallery screenshot ${i + 1}`,
      });
    }
  } else {
    const video = document.createElement("video");
    video.src = footageUrl;
    video.muted = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Footage load failed"));
    });

    const timestamps =
      kept.length > 0
        ? kept.map((m) => m.startSec ?? 0)
        : [video.duration * 0.2, video.duration * 0.4, video.duration * 0.6, video.duration * 0.8];

    for (let i = 0; i < Math.min(5, timestamps.length); i++) {
      const t = timestamps[i];
      const dataUrl = await grabFrame(video, t);
      screenshots.push({
        dataUrl,
        title: kept[i]?.title ?? `Gallery screenshot ${i + 1}`,
      });
    }
  }

  const poster = screenshots[0]?.dataUrl ?? "";
  const productHunt: LaunchAsset[] = [
    { id: "ph-poster", title: "Gallery poster (1270×760)", meta: "First gallery image — social meta" },
    { id: "ph-video", title: "Gallery video", meta: "45–60s · works muted · 16:9" },
    ...screenshots.map((s, i) => ({
      id: `ph-ss-${i}`,
      title: s.title,
      meta: "1270×760 PNG",
      body: s.dataUrl,
    })),
  ];

  const social: LaunchAsset[] = [
    { id: "soc-1", title: "Clip 1 — Problem hook", meta: "9:16 · TikTok / Reels" },
    { id: "soc-2", title: "Clip 2 — Product magic", meta: "9:16 · X / LinkedIn" },
    { id: "soc-3", title: "Clip 3 — CTA", meta: "1:1 · Follow-up" },
  ];

  if (poster) {
    productHunt[0] = { ...productHunt[0], body: poster };
  }

  void project;
  return { productHunt, social, screenshots };
}

export function drawPhPoster(
  screenshotDataUrl: string,
  productName: string,
  hook: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1270;
    canvas.height = 760;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      const brand = getBrandKit();
      ctx.fillStyle = brand.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const pad = 48;
      const frameW = canvas.width - pad * 2;
      const frameH = canvas.height - pad * 2 - 80;
      ctx.drawImage(img, pad, pad + 40, frameW, frameH);
      ctx.fillStyle = brand.primaryColor;
      ctx.fillRect(pad, pad, frameW, 4);
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(productName, pad, pad + 28);
      ctx.font = "400 18px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(hook.slice(0, 60), pad, canvas.height - pad);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = screenshotDataUrl;
  });
}
