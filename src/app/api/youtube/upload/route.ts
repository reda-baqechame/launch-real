import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { getProject } from "@/lib/db/projects";
import { resolvePublishVideo } from "@/lib/resolve-publish-video";
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

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Sync this project to cloud first (sign in on /settings).", 404);
  }

  const video = resolvePublishVideo(project);
  const title = body.title?.trim() || `${project.name} — launch video`;
  const description = body.description?.trim() || project.oneLiner || "Created with LaunchReel";

  if (!video.url) {
    return NextResponse.json(
      {
        ok: false,
        needsCloudBackup: true,
        message:
          "Hero video is not in cloud storage yet. Open /settings → Backup local media, then retry.",
        draft: { title, description, projectId, blobKey: video.blobKey },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "queued",
    message: `YouTube resumable upload ready for "${title}". Wire @googleapis/youtube in production.`,
    draft: {
      title,
      description,
      projectId,
      videoUrl: video.url,
      blobKey: video.blobKey,
    },
  });
}
