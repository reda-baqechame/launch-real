import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { createOAuthState } from "@/lib/oauth-state";
import { appBaseUrl, isProductHuntOAuthEnabled } from "@/lib/cloud/config";
import { isNextResponse, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  if (!isProductHuntOAuthEnabled()) {
    return jsonError("Product Hunt OAuth is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const params = new URLSearchParams({
    client_id: process.env.PRODUCT_HUNT_CLIENT_ID!,
    redirect_uri: `${appBaseUrl()}/api/oauth/producthunt/callback`,
    response_type: "code",
    state: createOAuthState(userId),
  });

  return NextResponse.redirect(
    `https://api.producthunt.com/v2/oauth/authorize?${params.toString()}`,
  );
}
