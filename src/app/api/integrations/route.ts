import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import {
  isBlobStorageEnabled,
  isCloudSyncEnabled,
  isProductHuntOAuthEnabled,
  isRemotionLambdaEnabled,
  isStripeEnabled,
  isTriggerEnabled,
  isYouTubeOAuthEnabled,
} from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { listOAuthConnections } from "@/lib/db/oauth";
import { isNextResponse } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const connections = isCloudSyncEnabled()
    ? await withDb(async (db) => listOAuthConnections(db, userId))
    : [];

  return NextResponse.json({
    cloudSync: isCloudSyncEnabled(),
    blobStorage: isBlobStorageEnabled(),
    stripe: isStripeEnabled(),
    trigger: isTriggerEnabled(),
    remotionLambda: isRemotionLambdaEnabled(),
    youtubeOAuth: isYouTubeOAuthEnabled(),
    productHuntOAuth: isProductHuntOAuthEnabled(),
    connections: (connections ?? []).map((c) => ({
      provider: c.provider,
      connected: Boolean(c.accessToken),
      expiresAt: c.expiresAt,
      metadata: c.metadata,
    })),
  });
}
