import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  isNextResponse,
  jsonError,
  logServerError,
  parseJsonBody,
  requireNonEmpty,
} from "@/lib/api-helpers";
import { resolveSeedanceKey } from "@/lib/server-keys";
import { assertSafeMediaUrl } from "@/lib/url-safety-server";
import { pollAvatar, submitAvatar } from "@/lib/avatar-client";
import { isLocalFreeRequest, localFreeAvatar } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeAvatar());
  }

  const limited = enforceRateLimit(req, "avatar");
  if (limited) return limited;

  const key = await resolveSeedanceKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{ imageUrl?: string; audioUrl?: string }>(req);
  if (isNextResponse(body)) return body;

  const rawImage = requireNonEmpty(body.imageUrl, "imageUrl");
  if (isNextResponse(rawImage)) return rawImage;
  const rawAudio = requireNonEmpty(body.audioUrl, "audioUrl");
  if (isNextResponse(rawAudio)) return rawAudio;

  // SSRF-guard both URLs before forwarding to fal.ai (allows data: URIs).
  let imageUrl: string;
  let audioUrl: string;
  try {
    imageUrl = await assertSafeMediaUrl(rawImage);
    audioUrl = await assertSafeMediaUrl(rawAudio);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Invalid media URL.", 400);
  }

  try {
    const { requestId } = await submitAvatar(key, { imageUrl, audioUrl });
    return NextResponse.json({ requestId, status: "queued" });
  } catch (err) {
    logServerError("avatar", err);
    return jsonError(err instanceof Error ? err.message : "Avatar dispatch failed.", 502);
  }
}

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ status: "done", localFree: true });
  }

  const key = await resolveSeedanceKey(req);
  if (isNextResponse(key)) return key;

  const requestId = new URL(req.url).searchParams.get("requestId");
  if (!requestId) return jsonError("Missing requestId.", 400);

  try {
    return NextResponse.json(await pollAvatar(key, requestId));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Avatar status failed.", 502);
  }
}
