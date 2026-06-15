import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Upload a rendered video to YouTube (requires OAuth connection). */
export async function POST(req: Request) {
  if (!isYouTubeOAuthEnabled()) {
    return jsonError("YouTube OAuth is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ projectId?: string; title?: string; description?: string }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const conn = await withDb(async (db) => getOAuthConnection(db, userId, "youtube"));
  if (!conn?.accessToken) {
    return jsonError("Connect YouTube on /settings first.", 400);
  }

  // Stub: real implementation uploads blob from cloud storage or presigned URL.
  const title = body.title?.trim() || `LaunchReel — ${projectId}`;
  const description = body.description?.trim() || "Created with LaunchReel";

  return NextResponse.json({
    ok: true,
    status: "stub",
    message: "YouTube upload queued — wire video blob + resumable upload in production.",
    draft: { title, description, projectId },
  });
}
