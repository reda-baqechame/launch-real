import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { createOAuthState } from "@/lib/oauth-state";
import { appBaseUrl, isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { isNextResponse, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
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
