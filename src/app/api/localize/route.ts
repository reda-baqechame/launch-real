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

import { localizeSystem } from "@/lib/ai-prompts";

export const runtime = "nodejs";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hook: { type: "string" },
    cta: { type: "string" },
    oneLiner: { type: "string" },
    x: { type: "string" },
  },
  required: ["hook", "cta", "oneLiner", "x"],
} as const;

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    productName: string;
    oneLiner: string;
    hook: string;
    cta: string;
    locale: string;
    style: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const productName = requireNonEmpty(body.productName, "productName");
  if (isNextResponse(productName)) return productName;
  const locale = requireNonEmpty(body.locale, "locale");
  if (isNextResponse(locale)) return locale;

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      system: localizeSystem(locale, body.style || "Native founder voice"),
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Product: ${productName}\nOne-liner: ${body.oneLiner}\nHook: ${body.hook}\nCTA: ${body.cta}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No localization.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Localize failed.");
  }
}
