import { NextResponse } from "next/server";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  if (!isLocalFreeRequest(req)) {
    return NextResponse.json({ error: "Local free upload is disabled." }, { status: 404 });
  }
  await req.arrayBuffer().catch(() => new ArrayBuffer(0));
  return NextResponse.json({ ok: true, localFree: true });
}

export async function POST(req: Request) {
  return PUT(req);
}
