import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { createPresignedUpload } from "@/lib/cloud/blob-storage";
import { isBlobStorageEnabled, isCloudSyncEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getProject } from "@/lib/db/projects";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty, safeClientError } from "@/lib/api-helpers";
import { isLocalFreeRequest, LOCAL_FREE_USER_ID } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ projectId?: string; blobKey?: string }>(req);
    if (isNextResponse(body)) return body;
    const projectId = body.projectId || "local-project";
    const blobKey = body.blobKey || "local-blob";
    const objectKey = `local-free/${LOCAL_FREE_USER_ID}/${projectId}/${blobKey}`;
    return NextResponse.json({
      uploadUrl: new URL("/api/blobs/local-free-upload", req.url).toString(),
      objectKey,
      publicUrl: new URL(`/local-free/${encodeURIComponent(blobKey)}`, req.url).toString(),
      localFree: true,
    });
  }

  if (!isBlobStorageEnabled()) {
    return jsonError("Blob storage is not configured (S3/R2).", 503);
  }
  if (!isCloudSyncEnabled()) {
    return jsonError("Cloud sync requires Postgres + Clerk.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{
    projectId?: string;
    blobKey?: string;
    contentType?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const blobKey = requireNonEmpty(body.blobKey, "blobKey");
  if (isNextResponse(blobKey)) return blobKey;
  if (blobKey.length > 256) {
    return jsonError("blobKey too long.", 400);
  }

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Project not found.", 404);
  }

  try {
    const presigned = await createPresignedUpload({
      clerkId: userId,
      projectId,
      blobKey,
      contentType: body.contentType ?? "application/octet-stream",
    });
    return NextResponse.json(presigned);
  } catch (e) {
    return safeClientError(e, "Presign failed.");
  }
}
