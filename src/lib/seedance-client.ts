import type { SeedanceMode } from "./types";

/**
 * Seedance (ByteDance) cinematic video engine, accessed via fal.ai's queue API.
 * Async job shape: submit -> poll status -> read result. Generation typically
 * takes 30-120s, so the route returns a requestId the client polls, mirroring
 * the render-queue pattern (no long-held serverless request).
 *
 * Model ids follow fal's namespacing; adjust here if fal renames the route.
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";

// fal model ids (verified): NO `fal-ai/` prefix for the ByteDance Seedance routes.
const MODEL_BY_MODE: Record<SeedanceMode, string> = {
  "text-to-video": "bytedance/seedance-2.0/text-to-video",
  "image-to-video": "bytedance/seedance-2.0/image-to-video",
};

export interface SeedanceParams {
  mode: SeedanceMode;
  prompt: string;
  aspect: "16:9" | "9:16" | "1:1";
  durationSec: number;
  resolution?: "720p" | "1080p";
  /** Data URL or https URL of the seed image (image-to-video). */
  imageUrl?: string;
  camera?: string;
}

export interface SeedanceSubmit {
  requestId: string;
}

export type SeedanceStatus = "queued" | "processing" | "done" | "failed";

export interface SeedancePoll {
  status: SeedanceStatus;
  videoUrl?: string;
  error?: string;
}

function authHeaders(falKey: string): Record<string, string> {
  return { Authorization: `Key ${falKey}`, "content-type": "application/json" };
}

function payloadFor(params: SeedanceParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspect,
    duration: Math.max(2, Math.round(params.durationSec)),
    resolution: params.resolution ?? "1080p",
  };
  if (params.camera) body.camera_movement = params.camera;
  if (params.mode === "image-to-video" && params.imageUrl) {
    body.image_url = params.imageUrl;
  }
  return body;
}

export async function submitSeedanceShot(
  falKey: string,
  params: SeedanceParams,
): Promise<SeedanceSubmit> {
  const model = MODEL_BY_MODE[params.mode];
  const res = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: "POST",
    headers: authHeaders(falKey),
    body: JSON.stringify(payloadFor(params)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Seedance submit failed (${res.status}). ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { request_id?: string };
  if (!data.request_id) throw new Error("Seedance did not return a request id.");
  return { requestId: data.request_id };
}

function extractVideoUrl(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return undefined;
  const o = output as Record<string, unknown>;
  const video = o.video as { url?: string } | undefined;
  if (video?.url) return video.url;
  const videos = o.videos as { url?: string }[] | undefined;
  if (Array.isArray(videos) && videos[0]?.url) return videos[0].url;
  if (typeof o.video_url === "string") return o.video_url;
  return undefined;
}

export async function pollSeedanceShot(
  falKey: string,
  mode: SeedanceMode,
  requestId: string,
): Promise<SeedancePoll> {
  const model = MODEL_BY_MODE[mode];
  const statusRes = await fetch(
    `${FAL_QUEUE_BASE}/${model}/requests/${requestId}/status`,
    { headers: authHeaders(falKey) },
  );
  if (!statusRes.ok) {
    return { status: "failed", error: `Status check failed (${statusRes.status}).` };
  }
  const status = (await statusRes.json()) as { status?: string };
  const s = status.status?.toUpperCase();

  if (s === "IN_QUEUE") return { status: "queued" };
  if (s === "IN_PROGRESS") return { status: "processing" };
  if (s !== "COMPLETED") return { status: "processing" };

  const resultRes = await fetch(`${FAL_QUEUE_BASE}/${model}/requests/${requestId}`, {
    headers: authHeaders(falKey),
  });
  if (!resultRes.ok) {
    return { status: "failed", error: `Result fetch failed (${resultRes.status}).` };
  }
  const result = await resultRes.json();
  const videoUrl = extractVideoUrl(result);
  if (!videoUrl) return { status: "failed", error: "No video in Seedance result." };
  return { status: "done", videoUrl };
}
