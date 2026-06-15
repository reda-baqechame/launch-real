import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireAnthropicKey,
} from "@/lib/api-helpers";
import { LIMITS } from "@/lib/api-limits";
export const runtime = "nodejs";

const ANALYZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    app_summary: { type: "string" },
    moments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          startSec: { type: "number" },
          endSec: { type: "number" },
          title: { type: "string" },
          role: {
            type: "string",
            enum: [
              "Problem setup",
              "Before",
              "Magic moment",
              "Feature reveal",
              "Proof",
              "Payoff",
              "CTA",
              "Tutorial step",
              "Remove",
              "Risky",
            ],
          },
          why: { type: "string" },
          wow_score: { type: "integer" },
          keepByDefault: { type: "boolean" },
        },
        required: ["id", "startSec", "endSec", "title", "role", "why", "wow_score", "keepByDefault"],
      },
    },
  },
  required: ["app_summary", "moments"],
} as const;

const SYSTEM = `You are Demo Director for LaunchReel. You analyze sampled frames from a software screen recording and identify the strongest demo moments for a launch video.

Rules:
- Return 3-6 moments ordered by wow_score descending.
- wow_score 0-100 = how demo-worthy / visually impressive the moment is.
- keepByDefault = true when wow_score >= 60.
- Assign story roles: Problem setup, Magic moment, Feature reveal, Proof, Payoff, CTA, etc.
- startSec/endSec must align with frame timestamps provided.
- Be specific to what is visible on screen, not generic.`;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    contextLine?: string;
    hasAudio?: boolean;
    frames: { tSec: number; dataUrl: string }[];
    transcript?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  if (!body.frames?.length) {
    return jsonError("No frames provided.", 400);
  }

  const frames = body.frames.slice(0, LIMITS.analyzeFrames).filter((f) => {
    const data = f.dataUrl?.replace(/^data:image\/\w+;base64,/, "") ?? "";
    return data.length > 0 && data.length <= LIMITS.analyzeFrameBase64Chars;
  });
  if (!frames.length) {
    return jsonError("No valid frames provided.", 400);
  }

  const client = new Anthropic({ apiKey: key });

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    {
      type: "text",
      text: [
        "Analyze these sampled frames from a software demo recording.",
        body.contextLine ? `Product context: ${body.contextLine}` : null,
        body.hasAudio ? "The recording has audio (narration may exist)." : "Silent recording.",
        body.transcript ? `Transcript anchor:\n${body.transcript}` : null,
        "Frame timestamps (seconds): " + frames.map((f) => f.tSec.toFixed(1)).join(", "),
        "Identify the best moments for a marketing launch video.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...frames.map((f) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: f.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
      },
    })),
  ];

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: ANALYZE_SCHEMA } },
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No analysis returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Analysis failed.");
  }
}
