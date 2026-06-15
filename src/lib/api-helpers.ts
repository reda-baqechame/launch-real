import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function parseJsonBody<T>(req: Request): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return jsonError("Invalid request body.", 400);
  }
}

export function requireAnthropicKey(req: Request): string | NextResponse {
  const key = req.headers.get("x-anthropic-key")?.trim();
  if (!key) return jsonError("No Anthropic key provided.", 400);
  return key;
}

export function requireNonEmpty(value: unknown, field: string): string | NextResponse {
  if (typeof value !== "string" || !value.trim()) {
    return jsonError(`Missing or empty "${field}".`, 400);
  }
  return value.trim();
}

export function handleAnthropicError(err: unknown, fallback = "Request failed."): NextResponse {
  if (err instanceof Anthropic.APIError) {
    return jsonError(err.message || fallback, err.status ?? 502);
  }
  return jsonError(fallback, 500);
}
