import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { handleAnthropicError, isNextResponse, jsonError, parseJsonBody } from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { PROMPT_PREAMBLE } from "@/lib/ai-prompts";
import { isLocalFreeRequest, localFreeTranslate } from "@/lib/local-free";

export const runtime = "nodejs";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hook: { type: "string" },
    cta: { type: "string" },
    lines: { type: "array", items: { type: "string" } },
  },
  required: ["hook", "cta", "lines"],
} as const;

export async function POST(req: Request) {
  const body = await parseJsonBody<{ hook?: string; cta?: string; lines?: string[]; language?: string }>(req);
  if (isNextResponse(body)) return body;

  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeTranslate(body));
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const language = (body.language || "Spanish").trim();
  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: `${PROMPT_PREAMBLE}\nTranslate launch video voiceover into ${language}. Natural, native phrasing for spoken delivery — not literal. Keep the meaning, tone, and product names. Return the same number of lines, in order.`,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            `Hook: ${body.hook ?? ""}`,
            `CTA: ${body.cta ?? ""}`,
            `Lines:\n${(body.lines ?? []).map((l, i) => `${i + 1}. ${l}`).join("\n")}`,
            `Translate all of the above into ${language}.`,
          ].join("\n\n"),
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return jsonError("No translation returned.", 502);
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Translation failed.");
  }
}
