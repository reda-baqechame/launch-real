import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { invokeRemotionLambda } from "@/lib/cloud/remotion-lambda";
import { isCloudSyncEnabled, isRemotionLambdaEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getProject } from "@/lib/db/projects";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ projectId?: string; compositionId?: string }>(req);
    if (isNextResponse(body)) return body;
    return NextResponse.json({
      ok: true,
      localFree: true,
      projectId: body.projectId ?? "local-project",
      compositionId: body.compositionId ?? "LaunchVideo",
      renderId: "local-free-render",
      status: "done",
    });
  }

  if (!isCloudSyncEnabled()) {
    return jsonError("Cloud sync requires Postgres + Clerk.", 503);
  }
  if (!isRemotionLambdaEnabled()) {
    return jsonError("Remotion Lambda is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ projectId?: string; compositionId?: string }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const project = await withDb(async (db) => getProject(db, userId, projectId));
  if (!project) {
    return jsonError("Project not found.", 404);
  }

  const result = await invokeRemotionLambda({
    projectId,
    compositionId: body.compositionId,
  });

  if ("error" in result) return jsonError(result.error, 503);
  return NextResponse.json(result);
}
