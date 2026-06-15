import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isCloudSyncEnabled } from "@/lib/cloud/config";
import { dispatchTriggerRenderJob } from "@/lib/cloud/trigger";
import { withDb } from "@/lib/db/client";
import { createRenderJob, getRenderJob, listRenderJobs } from "@/lib/db/render-jobs";
import { ensureAppUser, consumeCredit, getAppUser } from "@/lib/db/users";
import { isNextResponse, jsonError, parseJsonBody, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isCloudSyncEnabled()) {
    return jsonError("Render queue requires Postgres + Clerk.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ projectId?: string; aspects?: string[] }>(req);
  if (isNextResponse(body)) return body;

  const projectId = requireNonEmpty(body.projectId, "projectId");
  if (isNextResponse(projectId)) return projectId;

  const aspects = body.aspects?.length ? body.aspects : ["16:9", "9:16", "1:1"];

  const user = await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    return getAppUser(db, userId);
  });
  if (!user) return jsonError("Database unavailable.", 503);
  if (user.credits <= 0) {
    return jsonError("No render credits remaining. Upgrade on /pricing.", 402);
  }

  const consumed = await withDb(async (db) => consumeCredit(db, userId));
  if (!consumed) {
    return jsonError("No render credits remaining. Upgrade on /pricing.", 402);
  }

  const jobId = `job_${crypto.randomUUID()}`;
  const triggerRunId = await dispatchTriggerRenderJob({
    jobId,
    projectId,
    clerkId: userId,
    aspects,
  });

  const job = await withDb(async (db) =>
    createRenderJob(db, {
      id: jobId,
      clerkId: userId,
      projectId,
      payload: { aspects },
      triggerRunId: triggerRunId ?? undefined,
    }),
  );

  return NextResponse.json({ job, triggerDispatched: Boolean(triggerRunId) });
}

export async function GET(req: Request) {
  if (!isCloudSyncEnabled()) {
    return jsonError("Render queue requires Postgres + Clerk.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (jobId) {
    const job = await withDb(async (db) => getRenderJob(db, userId, jobId));
    if (!job) return jsonError("Job not found.", 404);
    return NextResponse.json({ job });
  }

  const jobs = await withDb(async (db) => listRenderJobs(db, userId, 10));
  return NextResponse.json({ jobs: jobs ?? [] });
}
