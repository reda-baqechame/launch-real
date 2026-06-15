import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { isProductHuntOAuthEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getOAuthConnection } from "@/lib/db/oauth";
import { getProject } from "@/lib/db/projects";
import { resolvePublishVideo } from "@/lib/resolve-publish-video";
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

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Sync this project to cloud first (sign in on /settings).", 404);
  }

  const video = resolvePublishVideo(project);
  const tagline = body.tagline?.trim() || project.oneLiner || project.name;
  const description = body.description?.trim() || project.oneLiner || "Created with LaunchReel";
  const poster = project.assets.productHunt.find((a) => a.id === "ph-poster")?.body;

  if (!video.url) {
    return NextResponse.json(
      {
        ok: false,
        needsCloudBackup: true,
        message:
          "Gallery video is not in cloud storage yet. Open /settings → Backup local media, then retry.",
        draft: { tagline, description, projectId, blobKey: video.blobKey },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "queued",
    message: `Product Hunt publish draft ready for "${project.name}". Wire GraphQL post mutation in production.`,
    draft: {
      tagline,
      description,
      projectId,
      videoUrl: video.url,
      posterImage: poster?.startsWith("data:") ? null : poster,
      blobKey: video.blobKey,
    },
  });
}
