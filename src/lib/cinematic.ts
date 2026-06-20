"use client";

import { fetchPublicConfig } from "./public-config-client";
import { pollSeedance, submitSeedance } from "./ai";
import { saveBlob, seedanceKey } from "./footage-store";
import type { CinematicPreset, ShotContext } from "./cinematic-presets";
import type { SeedanceClip } from "./types";

export interface GenerateShotOptions {
  aspect?: "16:9" | "9:16" | "1:1";
  /** Data URL / https URL of a seed image (image-to-video, first frame). */
  seedImageUrl?: string;
  lastFrameUrl?: string;
  resolution?: "720p" | "1080p";
  /** Polling cap; Seedance usually completes in 30-120s. */
  timeoutMs?: number;
  onStatus?: (status: string) => void;
}

const POLL_INTERVAL_MS = 4000;

function aspectDims(aspect: string): { w: number; h: number } {
  if (aspect === "9:16") return { w: 720, h: 1280 };
  if (aspect === "1:1") return { w: 720, h: 720 };
  return { w: 1280, h: 720 };
}

/**
 * Local-free / no-key fallback: render a short, brand-coloured motion card on a
 * canvas and record it to a real, playable webm. Lets the whole cinematic
 * pipeline run end-to-end with no fal.ai key or network.
 */
async function makePlaceholderClip(
  preset: CinematicPreset,
  ctx: ShotContext,
  aspect: string,
  durationSec: number,
): Promise<Blob> {
  const { w, h } = aspectDims(aspect);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas unavailable for placeholder clip.");

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  const start = performance.now();
  const total = Math.max(1500, durationSec * 1000);
  rec.start();

  function frame() {
    const t = (performance.now() - start) / total; // 0..1
    // Brand gradient with a slow drift to feel "cinematic".
    const drift = Math.sin(t * Math.PI) * 0.15;
    const grad = g!.createLinearGradient(0, h * (0.2 + drift), w, h * (0.8 - drift));
    grad.addColorStop(0, ctx.brand.backgroundColor || "#0a0a0a");
    grad.addColorStop(0.6, ctx.brand.primaryColor || "#1a1a2e");
    grad.addColorStop(1, ctx.brand.accentColor || "#6d28d9");
    g!.fillStyle = grad;
    g!.fillRect(0, 0, w, h);

    // Gentle scale/parallax on the label.
    const scale = 1 + 0.06 * Math.sin(t * Math.PI);
    g!.save();
    g!.translate(w / 2, h / 2);
    g!.scale(scale, scale);
    g!.textAlign = "center";
    g!.fillStyle = "rgba(255,255,255,0.96)";
    g!.font = `600 ${Math.round(h * 0.06)}px ui-sans-serif, system-ui, sans-serif`;
    g!.fillText(preset.label, 0, 0);
    g!.fillStyle = "rgba(255,255,255,0.6)";
    g!.font = `400 ${Math.round(h * 0.032)}px ui-sans-serif, system-ui, sans-serif`;
    g!.fillText(ctx.subject.slice(0, 48), 0, h * 0.075);
    g!.restore();

    if (performance.now() - start < total) {
      requestAnimationFrame(frame);
    } else {
      rec.stop();
    }
  }
  requestAnimationFrame(frame);

  return done;
}

/**
 * Generate one cinematic shot for a preset and persist it to IndexedDB.
 * Returns the SeedanceClip metadata (with its blobKey).
 */
export async function generateCinematicShot(
  projectId: string,
  preset: CinematicPreset,
  ctx: ShotContext,
  opts: GenerateShotOptions = {},
): Promise<SeedanceClip> {
  const aspect = opts.aspect ?? preset.recommendedAspect[0] ?? "16:9";
  const prompt = preset.buildPrompt(ctx);
  const id = `${preset.id}-${Date.now().toString(36)}`;
  const key = seedanceKey(projectId, id);
  const cfg = await fetchPublicConfig();

  let blob: Blob;

  if (cfg.localFree) {
    opts.onStatus?.("rendering preview");
    blob = await makePlaceholderClip(preset, ctx, aspect, preset.durationSec);
  } else {
    opts.onStatus?.("queued");
    const submit = await submitSeedance({
      mode: preset.mode,
      prompt,
      aspect,
      durationSec: preset.durationSec,
      resolution: opts.resolution,
      imageUrl: opts.seedImageUrl,
      lastFrameUrl: opts.lastFrameUrl,
      camera: preset.camera,
    });

    const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
    let videoUrl: string | undefined;
    for (;;) {
      if (Date.now() > deadline) throw new Error("Cinematic shot timed out.");
      const poll = await pollSeedance(submit.requestId, preset.mode);
      opts.onStatus?.(poll.status);
      if (poll.status === "done" && poll.videoUrl) {
        videoUrl = poll.videoUrl;
        break;
      }
      if (poll.status === "failed") {
        throw new Error(poll.error || "Cinematic shot failed.");
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    opts.onStatus?.("downloading");
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error("Could not download the generated shot.");
    blob = await res.blob();
  }

  await saveBlob(key, projectId, blob, "seedance");

  return {
    id,
    presetId: preset.id,
    label: preset.label,
    mode: preset.mode,
    prompt,
    aspect,
    durationSec: preset.durationSec,
    placement: preset.placement,
    blobKey: key,
    createdAt: new Date().toISOString(),
  };
}
