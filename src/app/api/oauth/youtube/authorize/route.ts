import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { createOAuthState } from "@/lib/oauth-state";
import { appBaseUrl, isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { isNextResponse, jsonError } from "@/lib/api-helpers";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.redirect(new URL("/settings?oauth=youtube_connected&localFree=1", req.url));
  }

  if (!isYouTubeOAuthEnabled()) {
    return jsonError("YouTube OAuth is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${appBaseUrl()}/api/oauth/youtube/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: createOAuthState(userId),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
