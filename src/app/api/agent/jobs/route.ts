import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/api-helpers";
import { requireAuthUserId } from "@/lib/auth";
import { runLocalFreeOperatorJob, runOperatorJob, type OperatorJobRequest } from "@/lib/agent-operator";
import { sanitizeOperatorJob } from "@/lib/agent-operator-store";
import { isLocalFreeRequest } from "@/lib/local-free";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { validatePublicHttpsUrl } from "@/lib/url-safety-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!rateLimit(`agent-jobs:${clientIp(req)}`, 3, 60_000)) {
    return NextResponse.json({ error: "Too many operator requests. Try again shortly." }, { status: 429 });
  }

  let body: OperatorJobRequest;
  try {
    body = (await req.json()) as OperatorJobRequest;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  try {
    await validatePublicHttpsUrl(body.url);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "URL not allowed." }, { status: 400 });
  }

  if (isLocalFreeRequest(req)) {
    const job = await runLocalFreeOperatorJob(body);
    return NextResponse.json(sanitizeOperatorJob(job));
  }

  if (process.env.NODE_ENV === "production") {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const job = await runOperatorJob(body, key);
  return NextResponse.json(sanitizeOperatorJob(job));
}
