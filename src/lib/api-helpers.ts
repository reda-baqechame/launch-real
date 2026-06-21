import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/api-limits";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Per-IP rate limit for expensive AI routes (abuse protection, not billing).
 * Returns a 429 NextResponse when over the limit, else null. In-memory =
 * per-instance; for multi-instance scale, back `rateLimit` with Upstash. // TODO
 */
export function enforceRateLimit(
  req: Request,
  name: string,
  perMin: number = LIMITS.aiRateLimitPerMin,
): NextResponse | null {
  const ok = rateLimit(`${name}:${clientIp(req)}`, perMin, 60_000);
  return ok ? null : jsonError("Too many requests — slow down and try again.", 429);
}

/** Structured, secret-safe server log for a failed route (+ optional Sentry). */
export function logServerError(route: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // Never logs request bodies or API keys — message only.
  console.error(JSON.stringify({ level: "error", route, message, at: new Date().toISOString() }));
  const sentry = (globalThis as { Sentry?: { captureException?: (e: unknown) => void } }).Sentry;
  if (sentry?.captureException) sentry.captureException(err);
}

/** Validate a user-supplied array length against LIMITS.maxArrayItems. */
export function capArray<T>(value: T[] | undefined, field: string, max = LIMITS.maxArrayItems): T[] | NextResponse {
  if (!Array.isArray(value)) return [];
  if (value.length > max) return jsonError(`Too many items in "${field}" (max ${max}).`, 400);
  return value;
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
  logServerError("anthropic", err);
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 502;
    const safe =
      status === 401 || status === 403 ?
        "Invalid Anthropic API key."
      : status === 429 ?
        "Anthropic rate limit reached — try again shortly."
      : fallback;
    return jsonError(safe, status >= 400 && status < 600 ? status : 502);
  }
  return jsonError(fallback, 500);
}

export function safeClientError(_err: unknown, fallback: string): NextResponse {
  return jsonError(fallback, 500);
}
