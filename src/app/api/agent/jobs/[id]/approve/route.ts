import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/api-helpers";
import { requireAuthUserId } from "@/lib/auth";
import { runLocalFreeOperatorJob, runOperatorJob } from "@/lib/agent-operator";
import { readOperatorJob, sanitizeOperatorJob, saveOperatorJob } from "@/lib/agent-operator-store";
import { isLocalFreeRequest } from "@/lib/local-free";
import { resolveAnthropicKey } from "@/lib/server-keys";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Props) {
  const { id } = await params;
  const existing = await readOperatorJob(id);
  if (!existing) return NextResponse.json({ error: "Operator job not found." }, { status: 404 });
  if (process.env.NODE_ENV === "production") {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
    if (existing.ownerUserId !== userId) return NextResponse.json({ error: "Operator job not found." }, { status: 404 });
  }
  if (existing.status !== "needs_approval") {
    return NextResponse.json({ error: "Operator job is not waiting for approval." }, { status: 409 });
  }

  const approved = existing.approvalRequests.at(-1);
  if (!approved) return NextResponse.json({ error: "No approval request found." }, { status: 409 });
  approved.approvedAt = new Date().toISOString();
  existing.approvedRiskKinds = Array.from(new Set([...existing.approvedRiskKinds, approved.risk]));
  existing.status = "queued";
  existing.updatedAt = new Date().toISOString();
  existing.traceSummary = `Approved ${approved.risk}; rerunning without stored credentials.`;
  await saveOperatorJob(existing);

  const rerun = {
    url: existing.url,
    contextLine: existing.contextLine,
    goal: existing.goal,
    instructions: existing.instructions,
    avoid: existing.avoid,
    stopWhen: existing.stopWhen,
    approvedRiskKinds: existing.approvedRiskKinds,
    ownerUserId: existing.ownerUserId,
  };

  if (isLocalFreeRequest(req)) {
    const job = await runLocalFreeOperatorJob(rerun);
    const merged = { ...job, id: existing.id, approvalRequests: existing.approvalRequests };
    await saveOperatorJob(merged);
    return NextResponse.json(sanitizeOperatorJob(merged));
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;
  const job = await runOperatorJob(rerun, key);
  const merged = { ...job, id: existing.id, approvalRequests: existing.approvalRequests };
  await saveOperatorJob(merged);
  return NextResponse.json(sanitizeOperatorJob(merged));
}
