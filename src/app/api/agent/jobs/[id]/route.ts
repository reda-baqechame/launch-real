import { NextResponse } from "next/server";
import { readOperatorJob, sanitizeOperatorJob } from "@/lib/agent-operator-store";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const job = await readOperatorJob(id);
  if (!job) return NextResponse.json({ error: "Operator job not found." }, { status: 404 });
  return NextResponse.json(sanitizeOperatorJob(job));
}
