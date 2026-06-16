import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isCloudSyncEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { deleteProject as deleteCloudProject, getProject, upsertProject } from "@/lib/db/projects";
import { ensureAppUser } from "@/lib/db/users";
import { isNextResponse, jsonError, parseJsonBody } from "@/lib/api-helpers";
import type { Project } from "@/lib/types";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  if (isLocalFreeRequest(_req)) return jsonError("Local free projects live in browser storage.", 404);

  if (!isCloudSyncEnabled()) return jsonError("Cloud sync is not configured.", 503);

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;
  const { id } = await ctx.params;

  const project = await withDb(async (db) => getProject(db, userId, id));
  if (!project) return jsonError("Project not found.", 404);
  return NextResponse.json({ project });
}

export async function PUT(req: Request, ctx: RouteCtx) {
  if (isLocalFreeRequest(req)) {
    const { id } = await ctx.params;
    const parsed = await parseJsonBody<{ project?: Project }>(req);
    if (isNextResponse(parsed)) return parsed;
    void parsed;
    return NextResponse.json({ ok: true, localFree: true, id });
  }

  if (!isCloudSyncEnabled()) return jsonError("Cloud sync is not configured.", 503);

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;
  const { id } = await ctx.params;

  const body = await parseJsonBody<{ project?: Project }>(req);
  if (isNextResponse(body)) return body;
  if (!body.project || body.project.id !== id) {
    return jsonError("Project id mismatch.", 400);
  }

  await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    await upsertProject(db, userId, body.project!);
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  if (isLocalFreeRequest(_req)) {
    const { id } = await ctx.params;
    return NextResponse.json({ ok: true, localFree: true, id });
  }

  if (!isCloudSyncEnabled()) return jsonError("Cloud sync is not configured.", 503);

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;
  const { id } = await ctx.params;

  const deleted = await withDb(async (db) => deleteCloudProject(db, userId, id));
  if (!deleted) return jsonError("Project not found.", 404);
  return NextResponse.json({ ok: true });
}
