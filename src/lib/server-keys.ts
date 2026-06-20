import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isHostedSaas } from "@/lib/cloud/config";
import { isNextResponse, jsonError } from "@/lib/api-helpers";

/** Anthropic: server env in hosted SaaS, else BYO header. */
export async function resolveAnthropicKey(req: Request): Promise<string | NextResponse> {
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (isHostedSaas()) {
    if (!envKey) {
      return jsonError("Anthropic is not configured on this server.", 503);
    }
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    return envKey;
  }

  const headerKey = req.headers.get("x-anthropic-key")?.trim();
  if (!headerKey) {
    if (isHostedSaas()) {
      return jsonError("Sign in required to use LaunchReel AI.", 401);
    }
    return jsonError("No Anthropic key provided.", 400);
  }
  return headerKey;
}

/** OpenAI: server env in hosted SaaS, else BYO header (may be null). */
export async function resolveOpenAiKey(req: Request): Promise<string | NextResponse | null> {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey && isHostedSaas()) {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    return envKey;
  }
  return req.headers.get("x-openai-key")?.trim() ?? null;
}

/** ElevenLabs: server env in hosted SaaS, else BYO header (may be null). */
export async function resolveElevenLabsKey(req: Request): Promise<string | NextResponse | null> {
  const envKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (envKey && isHostedSaas()) {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    return envKey;
  }
  return req.headers.get("x-elevenlabs-key")?.trim() ?? null;
}

/** fal.ai (Seedance): server env in hosted SaaS, else BYO header. */
export async function resolveSeedanceKey(req: Request): Promise<string | NextResponse> {
  const envKey = process.env.FAL_KEY?.trim();
  if (isHostedSaas()) {
    if (!envKey) {
      return jsonError("Cinematic video is not configured on this server.", 503);
    }
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    return envKey;
  }

  const headerKey = req.headers.get("x-fal-key")?.trim();
  if (!headerKey) {
    return jsonError("No fal.ai key provided. Add it in Settings to generate cinematic shots.", 400);
  }
  return headerKey;
}
