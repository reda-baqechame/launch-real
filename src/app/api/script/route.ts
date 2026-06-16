import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireAnthropicKey,
  requireNonEmpty,
} from "@/lib/api-helpers";
import { QUALITY_SELF_CHECK, scriptSystem } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const SCRIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hook: { type: "string" },
    cta: { type: "string" },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          startSec: { type: "number" },
          endSec: { type: "number" },
        },
        required: ["text", "startSec", "endSec"],
      },
    },
    shot_list: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          momentId: { type: "string" },
          durationSec: { type: "number" },
          zoomTarget: {
            type: "object",
            additionalProperties: false,
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              scale: { type: "number" },
            },
            required: ["x", "y", "scale"],
          },
        },
        required: ["momentId", "durationSec"],
      },
    },
  },
  required: ["hook", "cta", "lines", "shot_list"],
} as const;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    mode: string;
    appSummary: string;
    moments: { id: string; title: string; startSec?: number; endSec?: number }[];
    contextLine: string;
    language: string;
    hook: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const appSummary = requireNonEmpty(body.appSummary, "appSummary");
  if (isNextResponse(appSummary)) return appSummary;
  const hook = requireNonEmpty(body.hook, "hook");
  if (isNextResponse(hook)) return hook;
  if (!body.moments?.length) {
    return jsonError("At least one moment is required.", 400);
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: scriptSystem(body.mode ?? "marketing", body.language ?? "en"),
      output_config: { format: { type: "json_schema", schema: SCRIPT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            `Product: ${body.contextLine}`,
            `Summary: ${body.appSummary}`,
            `Main hook: ${body.hook}`,
            `Moments: ${JSON.stringify(body.moments)}`,
            "Write the script with timed voiceover lines and shot_list mapping momentIds to durations.",
            QUALITY_SELF_CHECK,
          ].join("\n"),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No script returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Script failed.");
  }
}
