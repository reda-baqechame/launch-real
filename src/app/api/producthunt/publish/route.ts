import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isProductHuntOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Publish launch kit to Product Hunt (requires OAuth connection). */
export async function POST(req: Request) {
  if (!isProductHuntOAuthEnabled()) {
    return jsonError("Product Hunt OAuth is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{
    projectId?: string;
    tagline?: string;
    description?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const conn = await withDb(async (db) => getOAuthConnection(db, userId, "producthunt"));
  if (!conn?.accessToken) {
    return jsonError("Connect Product Hunt on /settings first.", 400);
  }

  const tagline = body.tagline?.trim() || `LaunchReel — ${projectId}`;
  const description = body.description?.trim() || "Created with LaunchReel";

  return NextResponse.json({
    ok: true,
    status: "stub",
    message:
      "Product Hunt publish queued — wire GraphQL post mutation + gallery assets in production.",
    draft: { tagline, description, projectId },
  });
}
