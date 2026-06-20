import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
} from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { LIMITS } from "@/lib/api-limits";
import { DIRECTOR_SYSTEM } from "@/lib/ai-prompts";
import { isLocalFreeRequest, localFreeDirector } from "@/lib/local-free";

export const runtime = "nodejs";

const DIRECTOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    motion: { type: "integer" },
    brandFidelity: { type: "integer" },
    clarity: { type: "integer" },
    artifacts: { type: "integer" },
    total: { type: "integer" },
    pass: { type: "boolean" },
    notes: { type: "array", items: { type: "string" } },
    improvedPrompt: { type: "string" },
  },
  required: ["motion", "brandFidelity", "clarity", "artifacts", "total", "pass", "notes", "improvedPrompt"],
} as const;

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeDirector());
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    frames: { tSec: number; dataUrl: string }[];
    label?: string;
    placement?: string;
    hook?: string;
    aspect?: string;
    brandColors?: { primary?: string; accent?: string; bg?: string };
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

  const palette = body.brandColors
    ? `Brand palette — primary ${body.brandColors.primary ?? "?"}, accent ${body.brandColors.accent ?? "?"}, background ${body.brandColors.bg ?? "?"}.`
    : null;

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    {
      type: "text",
      text: [
        `Critique this cinematic shot. Preset: ${body.label ?? "unknown"}. Placement: ${body.placement ?? "broll"}.`,
        body.aspect ? `Aspect: ${body.aspect}.` : null,
        body.hook ? `Launch hook the video must support: "${body.hook}".` : null,
        palette,
        "Score against the rubric and return an improvedPrompt that fixes the weaknesses you see.",
      ]
        .filter(Boolean)
        .join("\n"),
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
      max_tokens: 2000,
      system: DIRECTOR_SYSTEM,
      output_config: { format: { type: "json_schema", schema: DIRECTOR_SCHEMA } },
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No critique returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Director critique failed.");
  }
}
