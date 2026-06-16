import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireAnthropicKey,
} from "@/lib/api-helpers";

import { JUDGE_SYSTEM, QUALITY_SELF_CHECK } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    winner: { type: "integer" },
    hook: { type: "integer" },
    clarity: { type: "integer" },
    pacing: { type: "integer" },
    artifacts: { type: "integer" },
    total: { type: "integer" },
    pass: { type: "boolean" },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["winner", "hook", "clarity", "pacing", "artifacts", "total", "pass", "notes"],
} as const;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{ variants: { variant: number; summary: string }[] }>(req);
  if (isNextResponse(body)) return body;

  if (!body.variants?.length) {
    return jsonError("At least one variant is required.", 400);
  }

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: JUDGE_SYSTEM,
      output_config: { format: { type: "json_schema", schema: JUDGE_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Score these variants:\n${body.variants.map((v) => `Variant ${v.variant}: ${v.summary}`).join("\n")}\n\n${QUALITY_SELF_CHECK}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No judge result.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Judge failed.");
  }
}
