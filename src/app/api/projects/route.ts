import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isCloudSyncEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { listProjects, upsertProject } from "@/lib/db/projects";
import { ensureAppUser } from "@/lib/db/users";
import { isNextResponse, jsonError, parseJsonBody } from "@/lib/api-helpers";
import type { Project } from "@/lib/types";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ enabled: true, localFree: true, projects: [] });
  }

  if (!isCloudSyncEnabled()) {
    return NextResponse.json({ enabled: false, projects: [] });
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const projects = await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    return listProjects(db, userId);
  });

  return NextResponse.json({ enabled: true, projects: projects ?? [] });
}

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ project?: Project }>(req);
    if (isNextResponse(body)) return body;
    return NextResponse.json({ ok: true, localFree: true, id: body.project?.id ?? null });
  }

  if (!isCloudSyncEnabled()) {
    return jsonError("Cloud sync is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ project?: Project }>(req);
  if (isNextResponse(body)) return body;
  if (!body.project?.id) return jsonError('Missing "project".', 400);

  await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    await upsertProject(db, userId, body.project!);
  });

  return NextResponse.json({ ok: true, id: body.project.id });
}
