import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isCloudSyncEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { listProjects, upsertProject } from "@/lib/db/projects";
import { ensureAppUser } from "@/lib/db/users";
import { isNextResponse, jsonError, parseJsonBody } from "@/lib/api-helpers";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

/** Push local projects up, return merged cloud list. */
export async function POST(req: Request) {
  if (!isCloudSyncEnabled()) {
    return jsonError("Cloud sync is not configured.", 503);
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ projects?: Project[] }>(req);
  if (isNextResponse(body)) return body;

  const incoming = body.projects ?? [];

  const merged = await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());

    for (const project of incoming) {
      if (project?.id) await upsertProject(db, userId, project);
    }

    return listProjects(db, userId);
  });

  return NextResponse.json({ projects: merged ?? [] });
}
