import { NextResponse } from "next/server";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";
import { resolveSeedanceKey } from "@/lib/server-keys";
import { pollAvatar, submitAvatar } from "@/lib/avatar-client";
import { isLocalFreeRequest, localFreeAvatar } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeAvatar());
  }

  const key = await resolveSeedanceKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{ imageUrl?: string; audioUrl?: string }>(req);
  if (isNextResponse(body)) return body;

  const imageUrl = requireNonEmpty(body.imageUrl, "imageUrl");
  if (isNextResponse(imageUrl)) return imageUrl;
  const audioUrl = requireNonEmpty(body.audioUrl, "audioUrl");
  if (isNextResponse(audioUrl)) return audioUrl;

  try {
    const { requestId } = await submitAvatar(key, { imageUrl, audioUrl });
    return NextResponse.json({ requestId, status: "queued" });
  } catch (err) {
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
