import { isTriggerEnabled } from "@/lib/cloud/config";

/** Dispatch render job to Trigger.dev when configured; otherwise no-op (client render). */
export async function dispatchTriggerRenderJob(input: {
  jobId: string;
  projectId: string;
  clerkId: string;
  aspects: string[];
}): Promise<string | null> {
  if (!isTriggerEnabled()) return null;

  const res = await fetch(`${process.env.TRIGGER_API_URL}/api/v1/tasks/render-launch-video/trigger`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payload: {
        jobId: input.jobId,
        projectId: input.projectId,
        clerkId: input.clerkId,
        aspects: input.aspects,
      },
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}
