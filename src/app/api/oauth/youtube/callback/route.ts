import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/oauth-state";
import { appBaseUrl, isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { upsertOAuthConnection } from "@/lib/db/oauth";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.redirect(new URL("/settings?oauth=youtube_connected&localFree=1", req.url));
  }

  if (!isYouTubeOAuthEnabled()) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=youtube_unconfigured`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clerkId = verifyOAuthState(url.searchParams.get("state"));
  const err = url.searchParams.get("error");

  if (err || !code || !clerkId) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=youtube_denied`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appBaseUrl()}/api/oauth/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=youtube_failed`);
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
      provider: "youtube",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      metadata: { connectedAt: new Date().toISOString() },
    }),
  );

  return NextResponse.redirect(`${appBaseUrl()}/settings?oauth=youtube_connected`);
}
