import { NextResponse } from "next/server";
import { LIMITS, trimText } from "@/lib/api-limits";
import { jsonError, parseJsonBody, isNextResponse, requireNonEmpty } from "@/lib/api-helpers";
import { isHostedSaas } from "@/lib/cloud/config";
import { resolveElevenLabsKey, resolveOpenAiKey } from "@/lib/server-keys";
import { isLocalFreeRequest, localFreeWav } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ text?: string }>(req);
    if (isNextResponse(body)) return body;
    return new NextResponse(localFreeWav(body.text), {
      headers: { "Content-Type": "audio/wav" },
    });
  }

  const openaiKey = await resolveOpenAiKey(req);
  if (isNextResponse(openaiKey)) return openaiKey;
  const elevenKey = await resolveElevenLabsKey(req);
  if (isNextResponse(elevenKey)) return elevenKey;

  const body = await parseJsonBody<{ text: string; language?: string; provider?: string }>(req);
  if (isNextResponse(body)) return body;

  const rawText = requireNonEmpty(body.text, "text");
  if (isNextResponse(rawText)) return rawText;
  const text = trimText(rawText, LIMITS.ttsTextChars);

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
        return jsonError("OpenAI TTS failed.", 502);
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
            text,
            model_id: "eleven_multilingual_v2",
          }),
        },
      );
      if (!res.ok) {
        return jsonError("ElevenLabs TTS failed.", 502);
      }
      const audio = await res.arrayBuffer();
      return new NextResponse(audio, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    if (isHostedSaas()) {
      return jsonError("TTS is not configured on this server.", 503);
    }
    return jsonError("No TTS key provided.", 400);
  } catch {
    return jsonError("TTS request failed.", 500);
  }
}
