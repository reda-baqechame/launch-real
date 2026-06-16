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
import { CAPTIONS_SYSTEM, QUALITY_SELF_CHECK } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const CAPTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    x: { type: "string" },
    linkedin: { type: "string" },
    phFirstComment: { type: "string" },
    socialClips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          caption: { type: "string" },
        },
        required: ["id", "caption"],
      },
    },
  },
  required: ["x", "linkedin", "phFirstComment", "socialClips"],
} as const;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    script: { hook: string; cta: string; lines: { text: string }[] };
    productName: string;
    socialClips?: { id: string; label: string; platform: string }[];
  }>(req);
  if (isNextResponse(body)) return body;

  const productName = requireNonEmpty(body.productName, "productName");
  if (isNextResponse(productName)) return productName;
  if (!body.script?.hook || !body.script?.cta) {
    return jsonError("Script hook and CTA are required.", 400);
  }

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: CAPTIONS_SYSTEM,
      output_config: { format: { type: "json_schema", schema: CAPTIONS_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            `Product: ${productName}`,
            `Hook: ${body.script.hook}`,
            `CTA: ${body.script.cta}`,
            `Script lines: ${body.script.lines?.map((l) => l.text).join(" ") ?? ""}`,
            body.socialClips?.length ?
              `Social clips:\n${body.socialClips.map((c) => `${c.id} (${c.label}, ${c.platform})`).join("\n")}`
            : null,
            QUALITY_SELF_CHECK,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No captions returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Captions failed.");
  }
}
