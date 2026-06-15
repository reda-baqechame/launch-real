import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const key =
    process.env.OAUTH_STATE_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    process.env.RENDER_WEBHOOK_SECRET;
  if (!key && process.env.NODE_ENV === "production") {
    throw new Error("OAuth state secret is not configured.");
  }
  return key ?? "launchreel-dev-oauth-state";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Signed OAuth state — binds callback to the initiating Clerk user. */
export function createOAuthState(clerkId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const exp = String(Date.now() + TTL_MS);
  const payload = `${clerkId}:${nonce}:${exp}`;
  return `${payload}:${sign(payload)}`;
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state?.trim()) return null;
  const parts = state.split(":");
  if (parts.length < 4) return null;

  const sig = parts.pop()!;
  const exp = parts.pop()!;
  const nonce = parts.pop()!;
  const clerkId = parts.join(":");
  if (!clerkId || !nonce || !exp) return null;

  const payload = `${clerkId}:${nonce}:${exp}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  if (Date.now() > Number(exp)) return null;
  return clerkId;
}
