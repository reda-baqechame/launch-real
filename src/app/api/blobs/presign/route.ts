import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { createPresignedUpload } from "@/lib/cloud/blob-storage";
import { isBlobStorageEnabled } from "@/lib/cloud/config";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBlobStorageEnabled()) {
    return jsonError("Blob storage is not configured (S3/R2).", 503);
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

  try {
    const presigned = await createPresignedUpload({
      clerkId: userId,
      projectId,
      blobKey,
      contentType: body.contentType ?? "application/octet-stream",
    });
    return NextResponse.json(presigned);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Presign failed.", 500);
  }
}
