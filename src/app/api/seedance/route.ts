import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isHostedSaas } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { addCredits, consumeCredit, ensureAppUser, getAppUser } from "@/lib/db/users";
import {
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireNonEmpty,
} from "@/lib/api-helpers";
import { resolveSeedanceKey } from "@/lib/server-keys";
import {
  pollSeedanceShot,
  submitSeedanceShot,
  type SeedanceParams,
} from "@/lib/seedance-client";
import type { SeedanceMode } from "@/lib/types";
import { isLocalFreeRequest, localFreeSeedanceShot } from "@/lib/local-free";

export const runtime = "nodejs";

const MODES: SeedanceMode[] = ["text-to-video", "image-to-video", "first-last-frame"];
const ASPECTS = ["16:9", "9:16", "1:1"] as const;

type Aspect = (typeof ASPECTS)[number];

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeSeedanceShot());
  }

  const key = await resolveSeedanceKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    mode?: SeedanceMode;
    prompt?: string;
    aspect?: Aspect;
    durationSec?: number;
    resolution?: "720p" | "1080p";
    imageUrl?: string;
    lastFrameUrl?: string;
    camera?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const prompt = requireNonEmpty(body.prompt, "prompt");
  if (isNextResponse(prompt)) return prompt;

  const mode: SeedanceMode = MODES.includes(body.mode as SeedanceMode)
    ? (body.mode as SeedanceMode)
    : "text-to-video";
  const aspect: Aspect = ASPECTS.includes(body.aspect as Aspect)
    ? (body.aspect as Aspect)
    : "16:9";

  // In hosted SaaS a cinematic shot costs a credit (refunded if dispatch fails).
  let creditUserId: string | null = null;
  if (isHostedSaas()) {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    const user = await withDb(async (db) => {
      await ensureAppUser(db, userId, await getAuthEmail());
      return getAppUser(db, userId);
    });
    if (!user) return jsonError("Database unavailable.", 503);
    if (user.credits <= 0) {
      return jsonError("No credits remaining. Upgrade on /pricing.", 402);
    }
    const consumed = await withDb(async (db) => consumeCredit(db, userId));
    if (!consumed) return jsonError("No credits remaining. Upgrade on /pricing.", 402);
    creditUserId = userId;
  }

  const params: SeedanceParams = {
    mode,
    prompt,
    aspect,
    durationSec: Math.max(2, Math.round(body.durationSec ?? 4)),
    resolution: body.resolution,
    imageUrl: body.imageUrl,
    lastFrameUrl: body.lastFrameUrl,
    camera: body.camera,
  };

  try {
    const { requestId } = await submitSeedanceShot(key, params);
    return NextResponse.json({ requestId, mode, status: "queued" });
  } catch (err) {
    if (creditUserId) await withDb(async (db) => addCredits(db, creditUserId!, 1));
    return jsonError(err instanceof Error ? err.message : "Seedance dispatch failed.", 502);
  }
}

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ status: "done", localFree: true });
  }

  const key = await resolveSeedanceKey(req);
  if (isNextResponse(key)) return key;

  const url = new URL(req.url);
  const requestId = url.searchParams.get("requestId");
  if (!requestId) return jsonError("Missing requestId.", 400);
  const mode = (url.searchParams.get("mode") as SeedanceMode) || "text-to-video";

  try {
    const poll = await pollSeedanceShot(key, mode, requestId);
    return NextResponse.json(poll);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Seedance status failed.", 502);
  }
}
