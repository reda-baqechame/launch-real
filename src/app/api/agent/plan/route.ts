import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { handleAnthropicError } from "@/lib/api-helpers";
import { AGENT_PLAN_SYSTEM } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          goal: { type: "string" },
          action: { type: "string" },
        },
        required: ["goal", "action"],
      },
    },
    avoid: { type: "array", items: { type: "string" } },
  },
  required: ["steps", "avoid"],
} as const;

export async function POST(req: Request) {
  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key." }, { status: 400 });
  }

  let body: { url: string; contextLine: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: AGENT_PLAN_SYSTEM,
      output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `URL: ${body.url}\nProduct: ${body.contextLine}\n${body.instructions ? `Instructions: ${body.instructions}` : ""}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No plan." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Plan failed.");
  }
}
