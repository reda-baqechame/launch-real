import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    body: { type: "string", description: "The rewritten copy. Plain text, ready to paste." },
  },
  required: ["body"],
} as const;

const SYSTEM = `You are the copy engine inside LaunchReel — a launch system for software founders.
You write founder-grade launch copy: clear, specific, and human. Never generic AI hype.

Hard rules:
- Match the asset type's platform and length (an X post is short; a launch email has a subject + body; a Product Hunt first comment is warm and personal).
- No overused AI words ("unleash", "elevate", "game-changer", "revolutionize", "seamless").
- No fake claims, no emoji spam, no clickbait.
- The obsession: a stranger should understand the product and care within 5 seconds.
- Return ONLY the rewritten copy in the "body" field — no preamble, no quotes around it.`;

export async function POST(req: Request) {
  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key provided." }, { status: 400 });
  }

  let body: {
    title?: string;
    body?: string;
    instruction?: string;
    context?: { name?: string; oneLiner?: string; audience?: string; hook?: string; cta?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ctx = body.context ?? {};
  const prompt = [
    `Product: ${ctx.name ?? "a software product"}`,
    ctx.oneLiner ? `What it is: ${ctx.oneLiner}` : null,
    ctx.audience ? `Audience: ${ctx.audience}` : null,
    ctx.hook ? `Launch hook: ${ctx.hook}` : null,
    ctx.cta ? `Preferred call to action (use it where a CTA fits): ${ctx.cta}` : null,
    "",
    `Asset to rewrite: ${body.title ?? "launch copy"}`,
    body.body ? `Current version:\n${body.body}` : null,
    "",
    `Instruction: ${body.instruction ?? "Rewrite it sharper, keeping the same intent."}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: COPY_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "The model returned no copy." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "The copy request was rejected." },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json({ error: "Rewrite failed. Try again." }, { status: 500 });
  }
}
