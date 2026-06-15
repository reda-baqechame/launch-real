/**
 * Trigger.dev task handler stub for cloud renders.
 * Deploy as a Trigger.dev job that POSTs back to /api/render-queue/complete.
 */
export interface RenderLaunchVideoPayload {
  jobId: string;
  projectId: string;
  clerkId: string;
  aspects: string[];
}

export async function handleRenderLaunchVideo(
  payload: RenderLaunchVideoPayload,
  appUrl: string,
  webhookSecret?: string,
): Promise<{ ok: boolean; message: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (webhookSecret) headers.Authorization = `Bearer ${webhookSecret}`;

  const res = await fetch(`${appUrl}/api/render-queue/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jobId: payload.jobId,
      status: "done",
      result: {
        aspects: payload.aspects,
        note: "Replace with real cloud render output URLs.",
      },
    }),
  });

  if (!res.ok) {
    return { ok: false, message: `Complete callback failed (${res.status}).` };
  }
  return { ok: true, message: `Job ${payload.jobId} marked done.` };
}
