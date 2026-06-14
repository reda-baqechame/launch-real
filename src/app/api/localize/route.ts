import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOCALIZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      description: "Localized assets in the same order as the input.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          body: { type: "string", description: "The localized, adapted copy." },
        },
        required: ["title", "body"],
      },
    },
  },
  required: ["items"],
} as const;

const SYSTEM = `You localize a software product's launch copy. This is NOT literal translation.
Adapt the message to the target market: idioms, cultural tone, the CTA, and the hook should feel native.
Keep each asset's platform fit and length. Preserve any {{placeholders}} exactly.
Keep the "title" field in English (it's a label); localize only the "body".
Match the requested voice/style. No AI hype words, no fake claims.`;

export async function POST(req: Request) {
  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key provided." }, { status: 400 });
  }

  let body: {
    language?: string;
    style?: string;
    context?: { name?: string; oneLiner?: string; hook?: string; cta?: string };
    items?: { title: string; body: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.items?.length) {
    return NextResponse.json({ error: "Nothing to localize." }, { status: 400 });
  }

  const ctx = body.context ?? {};
  const prompt = [
    `Localize the launch copy below into ${body.language ?? "French"}.`,
    `Voice/style: ${body.style ?? "Native founder voice"}.`,
    ctx.name ? `Product: ${ctx.name}` : null,
    ctx.oneLiner ? `What it is: ${ctx.oneLiner}` : null,
    ctx.hook ? `Launch hook: ${ctx.hook}` : null,
    ctx.cta ? `Preferred CTA (localize it naturally): ${ctx.cta}` : null,
    "",
    "Assets (JSON):",
    JSON.stringify(body.items),
  ]
    .filter((l) => l !== null)
    .join("\n");

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: LOCALIZE_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "The model returned nothing." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "The localize request was rejected." },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json({ error: "Localization failed." }, { status: 500 });
  }
}
