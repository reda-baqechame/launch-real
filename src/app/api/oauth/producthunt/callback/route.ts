import { NextResponse } from "next/server";
import { appBaseUrl, isProductHuntOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { upsertOAuthConnection } from "@/lib/db/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isProductHuntOAuthEnabled()) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=ph_unconfigured`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clerkId = url.searchParams.get("state");

  if (!code || !clerkId) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=ph_denied`);
  }

  const tokenRes = await fetch("https://api.producthunt.com/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PRODUCT_HUNT_CLIENT_ID,
      client_secret: process.env.PRODUCT_HUNT_CLIENT_SECRET,
      redirect_uri: `${appBaseUrl()}/api/oauth/producthunt/callback`,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=ph_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await withDb(async (db) =>
    upsertOAuthConnection(db, {
      clerkId,
      provider: "producthunt",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      metadata: { connectedAt: new Date().toISOString() },
    }),
  );

  return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=ph_connected`);
}
