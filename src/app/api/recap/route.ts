import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
} from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { RECAP_SYSTEM } from "@/lib/ai-prompts";
import { isLocalFreeRequest, localFreeRecap } from "@/lib/local-free";

export const runtime = "nodejs";

const RECAP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "A sharp video title. No hype." },
    summary: { type: "string", description: "1-2 sentence summary of the recording." },
    chapters: {
      type: "array",
      description: "3-6 chapters with mm:ss timecodes within the recording, increasing.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          time: { type: "string", description: "mm:ss timecode within the recording." },
          label: { type: "string", description: "Short chapter label." },
        },
        required: ["time", "label"],
      },
    },
  },
  required: ["title", "summary", "chapters"],
} as const;

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ notes?: string; durationSec?: number }>(req);
    if (isNextResponse(body)) return body;
    return NextResponse.json(localFreeRecap(body));
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{ notes?: string; durationSec?: number }>(req);
  if (isNextResponse(body)) return body;

  const duration = Math.max(1, Math.round(body.durationSec ?? 60));
  const prompt = [
    `Recording length: ${mmss(duration)} (${duration} seconds).`,
    body.notes?.trim()
      ? `Narration / notes:\n${body.notes.trim()}`
      : "No narration was captured — infer from a typical software product walkthrough.",
  ].join("\n\n");

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: RECAP_SYSTEM,
      output_config: { format: { type: "json_schema", schema: RECAP_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("The model returned no recap.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Recap failed. Try again.");
  }
}
