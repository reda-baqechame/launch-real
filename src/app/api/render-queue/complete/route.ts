import { NextResponse } from "next/server";
import { isCloudSyncEnabled, isProduction } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { updateRenderJobStatus } from "@/lib/db/render-jobs";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

/** Webhook for Trigger.dev / Lambda to mark render jobs complete. */
export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ ok: true, jobId: "local_job", status: "done", localFree: true });
  }

  if (!isCloudSyncEnabled()) {
    return jsonError("Render queue requires Postgres + Clerk.", 503);
  }

  const secret = process.env.RENDER_WEBHOOK_SECRET;
  if (!secret) {
    if (isProduction()) {
      return jsonError("RENDER_WEBHOOK_SECRET is required in production.", 503);
    }
  } else {
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
  const updated = await withDb(async (db) =>
    updateRenderJobStatus(db, jobId, status, {
      result: body.result,
      error: body.error?.slice(0, 500),
    }),
  );

  if (updated === null) {
    return jsonError("Database unavailable.", 503);
  }
  if (!updated) {
    return jsonError("Render job not found or already finalized.", 404);
  }

  return NextResponse.json({ ok: true, jobId, status });
}
