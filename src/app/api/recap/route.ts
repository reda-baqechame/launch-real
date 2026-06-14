import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

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

const SYSTEM = `You turn a software product screen-recording into clean video metadata.
From the narration and the recording length, produce:
- A sharp, specific title (no hype words, no emoji).
- A 1-2 sentence summary a viewer would read before pressing play.
- 3-6 chapters with mm:ss timecodes that fall within the recording length, in increasing order, starting at 0:00.
If the narration is sparse, infer reasonable chapters from a typical product walkthrough.`;

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key provided." }, { status: 400 });
  }

  let body: { notes?: string; durationSec?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

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
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: RECAP_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "The model returned no recap." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "The recap request was rejected." },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json({ error: "Recap failed. Try again." }, { status: 500 });
  }
}
