import type { Pool } from "pg";
import type { Project } from "@/lib/types";

export async function listProjects(db: Pool, clerkId: string): Promise<Project[]> {
  const res = await db.query(
    `SELECT data FROM projects WHERE clerk_id = $1 ORDER BY updated_at DESC`,
    [clerkId],
  );
  return res.rows.map((r) => r.data as Project);
}

export async function getProject(
  db: Pool,
  clerkId: string,
  projectId: string,
): Promise<Project | null> {
  const res = await db.query(
    `SELECT data FROM projects WHERE clerk_id = $1 AND id = $2`,
    [clerkId, projectId],
  );
  return res.rows[0]?.data ?? null;
}

export async function upsertProject(
  db: Pool,
  clerkId: string,
  project: Project,
): Promise<void> {
  await db.query(
    `INSERT INTO projects (id, clerk_id, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       data = EXCLUDED.data,
       updated_at = NOW()
     WHERE projects.clerk_id = EXCLUDED.clerk_id`,
    [project.id, clerkId, project],
  );
}

export async function deleteProject(
  db: Pool,
  clerkId: string,
  projectId: string,
): Promise<boolean> {
  const res = await db.query(
    `DELETE FROM projects WHERE clerk_id = $1 AND id = $2`,
    [clerkId, projectId],
  );
  return (res.rowCount ?? 0) > 0;
}
