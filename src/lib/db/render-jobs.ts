import type { Pool } from "pg";

export type RenderJobStatus = "queued" | "processing" | "done" | "failed";

export interface RenderJob {
  id: string;
  clerkId: string;
  projectId: string;
  status: RenderJobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  triggerRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToJob(row: Record<string, unknown>): RenderJob {
  return {
    id: row.id as string,
    clerkId: row.clerk_id as string,
    projectId: row.project_id as string,
    status: row.status as RenderJobStatus,
    payload: (row.payload as Record<string, unknown>) ?? {},
    result: (row.result as Record<string, unknown>) ?? null,
    error: (row.error as string) ?? null,
    triggerRunId: (row.trigger_run_id as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createRenderJob(
  db: Pool,
  input: {
    id: string;
    clerkId: string;
    projectId: string;
    payload: Record<string, unknown>;
    triggerRunId?: string;
  },
): Promise<RenderJob> {
  const res = await db.query(
    `INSERT INTO render_jobs (id, clerk_id, project_id, status, payload, trigger_run_id)
     VALUES ($1, $2, $3, 'queued', $4, $5)
     RETURNING *`,
    [input.id, input.clerkId, input.projectId, input.payload, input.triggerRunId ?? null],
  );
  return rowToJob(res.rows[0]);
}

export async function getRenderJob(
  db: Pool,
  clerkId: string,
  jobId: string,
): Promise<RenderJob | null> {
  const res = await db.query(
    `SELECT * FROM render_jobs WHERE clerk_id = $1 AND id = $2`,
    [clerkId, jobId],
  );
  return res.rows[0] ? rowToJob(res.rows[0]) : null;
}

export async function updateRenderJobStatus(
  db: Pool,
  jobId: string,
  status: RenderJobStatus,
  patch?: { result?: Record<string, unknown>; error?: string },
): Promise<void> {
  await db.query(
    `UPDATE render_jobs SET status = $2, result = COALESCE($3, result), error = COALESCE($4, error), updated_at = NOW()
     WHERE id = $1`,
    [jobId, status, patch?.result ?? null, patch?.error ?? null],
  );
}

export async function listRenderJobs(
  db: Pool,
  clerkId: string,
  limit = 10,
): Promise<RenderJob[]> {
  const res = await db.query(
    `SELECT * FROM render_jobs WHERE clerk_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [clerkId, limit],
  );
  return res.rows.map((row) => rowToJob(row));
}
