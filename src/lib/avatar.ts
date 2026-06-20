"use client";

import { fetchPublicConfig } from "./public-config-client";
import { avatarKey, saveBlob } from "./footage-store";
import { getFalKey } from "./ai";
import type { AvatarClip, BrandKit } from "./types";

export interface GenerateAvatarOptions {
  /** https/data URL of the narration audio (real lip-sync path). */
  audioUrl?: string;
  /** https/data URL of the presenter portrait (real lip-sync path). */
  presenterImageUrl?: string;
  durationSec?: number;
  onStatus?: (status: string) => void;
}

const POLL_INTERVAL_MS = 4000;

/**
 * Synthesize a branded talking-head placeholder on a canvas (no key/network).
 * A brand-gradient circle with the brand initial and an animated "speaking"
 * mouth — enough to design the presenter PiP layout and demo the pipeline.
 */
async function makeTalkingHeadPlaceholder(brand: BrandKit, durationSec: number): Promise<Blob> {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas unavailable for avatar placeholder.");

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
  const total = Math.max(2000, durationSec * 1000);
  const initial = (brand.logoText || "A").trim().charAt(0).toUpperCase();
  rec.start();

  function frame() {
    const t = (performance.now() - start) / total;
    const grad = g!.createRadialGradient(size / 2, size * 0.42, 20, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, brand.primaryColor || "#6d28d9");
    grad.addColorStop(1, brand.backgroundColor || "#0a0a0b");
    g!.fillStyle = grad;
    g!.fillRect(0, 0, size, size);

    // Head
    g!.fillStyle = "rgba(255,255,255,0.92)";
    g!.beginPath();
    g!.arc(size / 2, size * 0.42, size * 0.18, 0, Math.PI * 2);
    g!.fill();
    // Initial
    g!.fillStyle = brand.primaryColor || "#6d28d9";
    g!.font = `700 ${Math.round(size * 0.16)}px ui-sans-serif, system-ui, sans-serif`;
    g!.textAlign = "center";
    g!.textBaseline = "middle";
    g!.fillText(initial, size / 2, size * 0.42);
    // Animated speaking mouth
    const open = (Math.sin(t * Math.PI * 2 * 8) * 0.5 + 0.5) * size * 0.05 + size * 0.012;
    g!.fillStyle = "rgba(0,0,0,0.45)";
    g!.beginPath();
    g!.ellipse(size / 2, size * 0.52, size * 0.05, open, 0, 0, Math.PI * 2);
    g!.fill();
    // Shoulders
    g!.fillStyle = "rgba(255,255,255,0.85)";
    g!.beginPath();
    g!.arc(size / 2, size * 0.95, size * 0.28, Math.PI, 0);
    g!.fill();

    if (performance.now() - start < total) requestAnimationFrame(frame);
    else rec.stop();
  }
  requestAnimationFrame(frame);
  return done;
}

/** Generate an AI presenter clip and persist it to IndexedDB. */
export async function generateAvatarPresenter(
  projectId: string,
  brand: BrandKit,
  opts: GenerateAvatarOptions = {},
): Promise<AvatarClip> {
  const cfg = await fetchPublicConfig();
  const key = avatarKey(projectId);
  let blob: Blob;

  if (cfg.localFree) {
    opts.onStatus?.("rendering presenter");
    blob = await makeTalkingHeadPlaceholder(brand, opts.durationSec ?? 6);
  } else {
    if (!opts.audioUrl || !opts.presenterImageUrl) {
      throw new Error(
        "AI presenter needs a hosted narration audio URL and a presenter image URL (enable cloud storage).",
      );
    }
    opts.onStatus?.("queued");
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (!cfg.hosted) {
      const fal = getFalKey();
      if (!fal) throw new Error("No fal.ai key connected.");
      headers["x-fal-key"] = fal;
    }
    const submitRes = await fetch("/api/avatar", {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl: opts.presenterImageUrl, audioUrl: opts.audioUrl }),
    });
    if (!submitRes.ok) throw new Error("Avatar dispatch failed.");
    const { requestId } = (await submitRes.json()) as { requestId: string };

    const deadline = Date.now() + 5 * 60_000;
    let videoUrl: string | undefined;
    for (;;) {
      if (Date.now() > deadline) throw new Error("Avatar timed out.");
      const pollRes = await fetch(`/api/avatar?requestId=${encodeURIComponent(requestId)}`, { headers });
      const poll = (await pollRes.json()) as { status: string; videoUrl?: string; error?: string };
      opts.onStatus?.(poll.status);
      if (poll.status === "done" && poll.videoUrl) {
        videoUrl = poll.videoUrl;
        break;
      }
      if (poll.status === "failed") throw new Error(poll.error || "Avatar failed.");
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    opts.onStatus?.("downloading");
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error("Could not download the presenter clip.");
    blob = await res.blob();
  }

  await saveBlob(key, projectId, blob, "avatar");
  return {
    id: `avatar-${Date.now().toString(36)}`,
    style: "presenter",
    blobKey: key,
    createdAt: new Date().toISOString(),
    enabled: true,
  };
}
