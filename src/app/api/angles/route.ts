import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ANGLE_KINDS = ["Pain-first", "Speed-first", "Cost-first", "Category-first", "Founder-story"];
const ANGLE_IDS = ["pain", "speed", "cost", "category", "founder"];

const ANGLES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    angles: {
      type: "array",
      description: "Exactly 5 launch angles, one per kind, in order.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", enum: ANGLE_IDS },
          kind: { type: "string", enum: ANGLE_KINDS },
          hook: { type: "string", description: "The angle's hook, one line." },
          audience: { type: "string", description: "Who this angle is best for." },
          platformFit: { type: "string", description: "Best platform(s), short." },
          emotion: { type: "string", description: "The emotional driver." },
          risk: { type: "string", description: "The risk of this angle, short." },
          whyItWorks: { type: "string" },
          whyItFails: { type: "string" },
          firstLine: { type: "string", description: "An example opening sentence." },
        },
        required: [
          "id", "kind", "hook", "audience", "platformFit",
          "emotion", "risk", "whyItWorks", "whyItFails", "firstLine",
        ],
      },
    },
  },
  required: ["angles"],
} as const;

const SYSTEM = `You are the Narrative Builder inside LaunchReel, a launch system for software founders.
Given a software product, you produce 5 distinct launch angles so the founder can pick the one that fits.

Rules:
- Return EXACTLY 5 angles, one of each kind, in this order and with these ids:
  pain (Pain-first), speed (Speed-first), cost (Cost-first), category (Category-first), founder (Founder-story).
- Each angle must be specific to THIS product — no boilerplate.
- Be honest: whyItFails must name a real risk, not a humblebrag.
- Hooks are sharp and founder-grade. No AI hype words.`;

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

  const prompt = [
    "Generate 5 launch angles for this software product.",
    body.url ? `Product URL: ${body.url}` : null,
    body.description ? `What it does / who it's for: ${body.description}` : null,
    body.audience ? `Target audience: ${body.audience}` : null,
    !body.url && !body.description ? "No details given — infer a plausible software product." : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: ANGLES_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "The model returned no angles." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "The angles request was rejected." },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json({ error: "Angle generation failed." }, { status: 500 });
  }
}
