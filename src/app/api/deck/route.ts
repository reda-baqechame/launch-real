import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { DECK_SYSTEM, QUALITY_SELF_CHECK } from "@/lib/ai-prompts";
import { isLocalFreeRequest, localFreeDeck } from "@/lib/local-free";

export const runtime = "nodejs";

const DECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          kind: { type: "string", enum: ["title", "point", "cta"] },
        },
        required: ["title", "bullets", "kind"],
      },
    },
  },
  required: ["slides"],
} as const;

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    const body = await parseJsonBody<{ productName?: string; oneLiner?: string; hook?: string }>(req);
    if (isNextResponse(body)) return body;
    return NextResponse.json(localFreeDeck(body));
  }

  const limited = enforceRateLimit(req, "deck");
  if (limited) return limited;

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{
    productName?: string;
    oneLiner?: string;
    hook?: string;
    cta?: string;
    audience?: string;
    moments?: string[];
    weakestPoint?: string;
  }>(req);
  if (isNextResponse(body)) return body;

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: DECK_SYSTEM,
      output_config: { format: { type: "json_schema", schema: DECK_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            `Product: ${body.productName ?? "this product"}`,
            body.oneLiner ? `One-liner: ${body.oneLiner}` : null,
            body.hook ? `Hook: ${body.hook}` : null,
            body.audience ? `Audience: ${body.audience}` : null,
            body.weakestPoint ? `Known weakness to address: ${body.weakestPoint}` : null,
            body.moments?.length ? `Key moments: ${body.moments.join("; ")}` : null,
            body.cta ? `CTA: ${body.cta}` : null,
            "Write the deck.",
            QUALITY_SELF_CHECK,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No deck returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Deck generation failed.");
  }
}
