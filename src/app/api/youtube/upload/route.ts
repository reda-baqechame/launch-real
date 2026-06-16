import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { getYouTubeAccessToken } from "@/lib/cloud/google-oauth";
import { uploadVideoToYouTube } from "@/lib/cloud/youtube-upload";
import { isYouTubeOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { getProject } from "@/lib/db/projects";
import { resolvePublishVideo } from "@/lib/resolve-publish-video";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty, safeClientError } from "@/lib/api-helpers";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

/** Upload a rendered video to YouTube (requires OAuth connection). */
export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ projectId?: string; title?: string; privacyStatus?: string }>(req);
    if (isNextResponse(body)) return body;
    return NextResponse.json({
      ok: true,
      status: "uploaded",
      localFree: true,
      message: `Local free YouTube upload prepared (${body.privacyStatus ?? "unlisted"}).`,
      videoId: "local-free-youtube-video",
      url: "https://youtube.com/watch?v=local-free-youtube-video",
      projectId: body.projectId ?? "local-project",
      title: body.title ?? "Local free launch video",
    });
  }

  if (!isYouTubeOAuthEnabled()) {
    return jsonError("YouTube OAuth is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{
    projectId?: string;
    title?: string;
    description?: string;
    privacyStatus?: "public" | "unlisted" | "private";
  }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const hasConn = await withDb(async (db) => getOAuthConnection(db, userId, "youtube"));
  if (!hasConn?.accessToken) {
    return jsonError("Connect YouTube on /settings first.", 400);
  }

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Sync this project to cloud first (sign in on /settings).", 404);
  }

  const video = resolvePublishVideo(project, userId);
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

  const accessToken = await withDb(async (db) => getYouTubeAccessToken(db!, userId));
  if (!accessToken) {
    return jsonError("YouTube token expired. Reconnect on /settings.", 401);
  }

  try {
    const uploaded = await uploadVideoToYouTube({
      accessToken,
      videoUrl: video.url,
      title,
      description,
      privacyStatus: body.privacyStatus ?? "unlisted",
    });

    return NextResponse.json({
      ok: true,
      status: "uploaded",
      message: `Uploaded to YouTube (${body.privacyStatus ?? "unlisted"}): ${uploaded.url}`,
      videoId: uploaded.videoId,
      url: uploaded.url,
      projectId,
    });
  } catch (e) {
    return safeClientError(e, "YouTube upload failed.");
  }
}
