import { NextResponse } from "next/server";
import { jsonError, parseJsonBody, isNextResponse, requireNonEmpty } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const elevenKey = req.headers.get("x-elevenlabs-key");
  const openaiKey = req.headers.get("x-openai-key");

  const body = await parseJsonBody<{ text: string; language?: string; provider?: string }>(req);
  if (isNextResponse(body)) return body;

  const text = requireNonEmpty(body.text, "text");
  if (isNextResponse(text)) return text;

  const provider = body.provider ?? (openaiKey ? "openai" : "elevenlabs");

  try {
    if (provider === "openai" && openaiKey) {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          input: text,
          response_format: "mp3",
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err || "OpenAI TTS failed." }, { status: 502 });
      }
      const audio = await res.arrayBuffer();
      return new NextResponse(audio, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    if (elevenKey) {
      const voiceId =
        body.language === "fr"
          ? "pNInz6obpgDQGcFmaJgB"
          : body.language === "ar"
            ? "pNInz6obpgDQGcFmaJgB"
            : "pNInz6obpgDQGcFmaJgB";
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err || "ElevenLabs TTS failed." }, { status: 502 });
      }
      const audio = await res.arrayBuffer();
      return new NextResponse(audio, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    return jsonError("No TTS key provided.", 400);
  } catch {
    return jsonError("TTS request failed.", 500);
  }
}
