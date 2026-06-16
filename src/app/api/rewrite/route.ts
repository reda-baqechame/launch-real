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
import { REWRITE_MODE_GUIDES } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    text: string;
    mode: "founder" | "punchy" | "less-hype" | "technical";
  }>(req);
  if (isNextResponse(body)) return body;

  const text = requireNonEmpty(body.text, "text");
  if (isNextResponse(text)) return text;

  const mode = body.mode ?? "founder";
  const system = REWRITE_MODE_GUIDES[mode] ?? REWRITE_MODE_GUIDES.founder;

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: text }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No rewrite.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Rewrite failed.");
  }
}
