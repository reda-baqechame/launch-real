import { NextResponse } from "next/server";
import { isCloudSyncEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { updateRenderJobStatus } from "@/lib/db/render-jobs";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Webhook for Trigger.dev / Lambda to mark render jobs complete. */
export async function POST(req: Request) {
  if (!isCloudSyncEnabled()) {
    return jsonError("Render queue requires Postgres + Clerk.", 503);
  }

  const secret = process.env.RENDER_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return jsonError("Unauthorized.", 401);
    }
  }

  const body = await parseJsonBody<{
    jobId?: string;
    status?: "done" | "failed";
    result?: Record<string, unknown>;
    error?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const jobId = requireNonEmpty(body.jobId, "jobId");
  if (isNextResponse(jobId)) return jobId;

  const status = body.status === "failed" ? "failed" : "done";
  await withDb(async (db) =>
    updateRenderJobStatus(db, jobId, status, {
      result: body.result,
      error: body.error,
    }),
  );

  return NextResponse.json({ ok: true, jobId, status });
}
