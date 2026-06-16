import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/api-limits";
import { jsonError, isNextResponse } from "@/lib/api-helpers";
import { isHostedSaas } from "@/lib/cloud/config";
import { resolveOpenAiKey } from "@/lib/server-keys";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({
      text: "Local free transcript: the product shows a problem, a core workflow, and a launch-ready payoff.",
    });
  }

  const key = await resolveOpenAiKey(req);
  if (isNextResponse(key)) return key;
  if (!key) {
    if (isHostedSaas()) {
      return jsonError("Transcription is not configured on this server.", 503);
    }
    return jsonError("OpenAI key required for transcription.", 400);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart form with a file.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return jsonError("No audio/file file provided.", 400);
  }
  if (file.size > LIMITS.transcribeBytes) {
    return jsonError("File too large for transcription.", 413);
  }

  const body = new FormData();
  body.append("file", file, "recording.webm");
  body.append("model", "whisper-1");
  body.append("response_format", "json");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
    });
    if (!res.ok) {
      return jsonError(`Transcription failed (${res.status}).`, res.status >= 500 ? 502 : res.status);
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: data.text?.trim() ?? "" });
  } catch {
    return jsonError("Transcription failed.", 500);
  }
}
