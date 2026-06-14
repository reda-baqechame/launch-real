import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// JSON schema the model is constrained to. Mirrors the AiAudit type.
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", description: "Overall launch score, 0-100." },
    strongestAngle: { type: "string", description: "The single strongest launch angle, one sentence." },
    weakestPoint: { type: "string", description: "The biggest weakness in the current launch, one sentence." },
    bestAudience: { type: "string", description: "The audience most likely to care, one sentence." },
    bestDemoMoment: { type: "string", description: "The most compelling thing to show in a demo." },
    recommendedHook: { type: "string", description: "A punchy recommended hook, under 10 words." },
    mainHook: { type: "string", description: "The headline hook for the launch, one short line." },
    refinedOneLiner: { type: "string", description: "A sharp one-line value proposition for the product." },
    breakdown: {
      type: "array",
      description: "Exactly 8 scored dimensions.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "integer", description: "0-100" },
        },
        required: ["label", "value"],
      },
    },
    criticism: {
      type: "array",
      description: "2-4 specific, honest critiques.",
      items: { type: "string" },
    },
  },
  required: [
    "score",
    "strongestAngle",
    "weakestPoint",
    "bestAudience",
    "bestDemoMoment",
    "recommendedHook",
    "mainHook",
    "refinedOneLiner",
    "breakdown",
    "criticism",
  ],
} as const;

const SYSTEM = `You are Launch Doctor, the strategic brain of LaunchReel — an AI launch system for software founders.
You audit a software product and give honest, specific judgment, not generic praise.
The obsession: can a stranger understand this product and care within 5 seconds?

Rules:
- Be brutally honest but constructive. Name the real weakness.
- Criticism must be specific to THIS product, never boilerplate.
- The 8 breakdown dimensions must be exactly: Clarity, Pain intensity, Differentiation, Demo strength, Proof, Launch readiness, Visual quality, CTA strength.
- Scores are 0-100 and should reflect genuine variance (avoid clustering everything at 80).
- Hooks should be sharp and founder-grade, not hype slop.`;

function userPrompt(url?: string, description?: string, audience?: string): string {
  return [
    "Audit this software product for launch.",
    url ? `Product URL: ${url}` : null,
    description ? `What it does / who it's for: ${description}` : null,
    audience ? `Target audience: ${audience}` : null,
    !url && !description ? "The founder gave no details — infer a plausible software product and audit it." : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key provided." }, { status: 400 });
  }

  let body: { url?: string; description?: string; audience?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: AUDIT_SCHEMA } },
      messages: [
        { role: "user", content: userPrompt(body.url, body.description, body.audience) },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "The model returned no audit." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "The audit request was rejected." },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json({ error: "Audit failed. Try again." }, { status: 500 });
  }
}
