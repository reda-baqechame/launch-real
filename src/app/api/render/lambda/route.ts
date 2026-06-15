import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { invokeRemotionLambda } from "@/lib/cloud/remotion-lambda";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ projectId?: string; compositionId?: string }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const result = await invokeRemotionLambda({
    projectId,
    compositionId: body.compositionId,
  });

  if ("error" in result) return jsonError(result.error, 503);
  return NextResponse.json(result);
}
