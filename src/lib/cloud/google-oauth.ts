import type { Pool } from "pg";
import { getOAuthConnection, upsertOAuthConnection } from "@/lib/db/oauth";

/** Return a valid YouTube access token, refreshing when expired. */
export async function getYouTubeAccessToken(
  db: Pool,
  clerkId: string,
): Promise<string | null> {
  const conn = await getOAuthConnection(db, clerkId, "youtube");
  if (!conn?.accessToken) return null;

  const expiresAt = conn.expiresAt ? new Date(conn.expiresAt).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;
  if (stillValid || !conn.refreshToken) return conn.accessToken;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) return conn.accessToken;

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const nextExpires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await upsertOAuthConnection(db, {
    clerkId,
    provider: "youtube",
    accessToken: tokens.access_token,
    refreshToken: conn.refreshToken,
    expiresAt: nextExpires,
    metadata: conn.metadata,
  });

  return tokens.access_token;
}
