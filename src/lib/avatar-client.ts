/**
 * AI presenter (talking-head, lip-synced) via fal.ai, reusing the same fal key as
 * Seedance. A lip-sync model takes a presenter image + the narration audio and
 * returns a talking-head video. Async submit -> poll -> result, mirroring
 * seedance-client. Model id follows fal's namespacing; adjust if fal renames it.
 *
 * Note: real lip-sync needs publicly-fetchable image_url + audio_url (hosted blob
 * storage). The local-free path synthesizes a placeholder talking head instead.
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";
const LIPSYNC_MODEL = "fal-ai/sadtalker";

export interface AvatarParams {
  /** https/data URL of the presenter portrait. */
  imageUrl: string;
  /** https/data URL of the narration audio. */
  audioUrl: string;
}

export interface AvatarSubmit {
  requestId: string;
}

export type AvatarStatus = "queued" | "processing" | "done" | "failed";

export interface AvatarPoll {
  status: AvatarStatus;
  videoUrl?: string;
  error?: string;
}

function authHeaders(falKey: string): Record<string, string> {
  return { Authorization: `Key ${falKey}`, "content-type": "application/json" };
}

export async function submitAvatar(falKey: string, params: AvatarParams): Promise<AvatarSubmit> {
  const res = await fetch(`${FAL_QUEUE_BASE}/${LIPSYNC_MODEL}`, {
    method: "POST",
    headers: authHeaders(falKey),
    body: JSON.stringify({
      source_image_url: params.imageUrl,
      driven_audio_url: params.audioUrl,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Avatar submit failed (${res.status}). ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { request_id?: string };
  if (!data.request_id) throw new Error("Avatar model did not return a request id.");
  return { requestId: data.request_id };
}

export async function pollAvatar(falKey: string, requestId: string): Promise<AvatarPoll> {
  const statusRes = await fetch(
    `${FAL_QUEUE_BASE}/${LIPSYNC_MODEL}/requests/${requestId}/status`,
    { headers: authHeaders(falKey) },
  );
  if (!statusRes.ok) return { status: "failed", error: `Status check failed (${statusRes.status}).` };
  const status = (await statusRes.json()) as { status?: string };
  const s = status.status?.toUpperCase();
  if (s === "IN_QUEUE") return { status: "queued" };
  if (s !== "COMPLETED") return { status: "processing" };

  const resultRes = await fetch(`${FAL_QUEUE_BASE}/${LIPSYNC_MODEL}/requests/${requestId}`, {
    headers: authHeaders(falKey),
  });
  if (!resultRes.ok) return { status: "failed", error: `Result fetch failed (${resultRes.status}).` };
  const result = (await resultRes.json()) as { video?: { url?: string }; video_url?: string };
  const videoUrl = result.video?.url ?? result.video_url;
  if (!videoUrl) return { status: "failed", error: "No video in avatar result." };
  return { status: "done", videoUrl };
}
