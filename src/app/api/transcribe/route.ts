import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/api-limits";
import { jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = req.headers.get("x-openai-key");
  if (!key) {
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
