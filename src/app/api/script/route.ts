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

const MODE_PROMPTS: Record<string, string> = {
  marketing:
    "Structure: HOOK (problem) → AGITATE → REVEAL product → PROOF (2-3 moments) → CTA. Fast pace, punchy lines, 30-60s total.",
  explainer:
    "Structure: WHAT IT IS → HOW IT WORKS (3 features) → WHO IT'S FOR → CTA. Calm pace, 60-90s total.",
  tutorial:
    "Structure: GOAL → numbered STEPS (one per moment) → RECAP. Clear instructional tone, 2-4 min total.",
};

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
  const modeGuide = MODE_PROMPTS[body.mode] ?? MODE_PROMPTS.marketing;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: `You are the LaunchReel script writer. Write voiceover lines timed to demo moments for a software launch video. ${modeGuide} Write natively in ${body.language}. Return ONLY valid JSON.`,
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
