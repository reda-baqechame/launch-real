import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isProductHuntOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { getProject } from "@/lib/db/projects";
import { buildPhLaunchPackage } from "@/lib/ph-launch-prep";
import { resolvePublishVideo } from "@/lib/resolve-publish-video";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

/**
 * Prepare Product Hunt launch package (PH has no public create-post API).
 * Requires OAuth so we know the user connected their PH account.
 */
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

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Sync this project to cloud first (sign in on /settings).", 404);
  }

  const video = resolvePublishVideo(project);
  if (!video.url) {
    return NextResponse.json(
      {
        ok: false,
        needsCloudBackup: true,
        message:
          "Gallery video is not in cloud storage yet. Open /settings → Backup local media, then retry.",
        draft: { projectId, blobKey: video.blobKey },
      },
      { status: 409 },
    );
  }

  const launchPackage = buildPhLaunchPackage(project, video.url);
  if (body.tagline?.trim()) launchPackage.tagline = body.tagline.trim();
  if (body.description?.trim()) launchPackage.description = body.description.trim();

  return NextResponse.json({
    ok: true,
    status: "prepared",
    message: launchPackage.apiNote,
    launchPackage,
    projectId,
  });
}
