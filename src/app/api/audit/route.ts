import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireAnthropicKey,
} from "@/lib/api-helpers";
import { AUDIT_SYSTEM, QUALITY_SELF_CHECK } from "@/lib/ai-prompts";

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

function userPrompt(url?: string, description?: string, audience?: string): string {
  return [
    "Audit this software product for launch.",
    url ? `Product URL: ${url}` : null,
    description ? `What it does / who it's for: ${description}` : null,
    audience ? `Target audience: ${audience}` : null,
    !url && !description ? "The founder gave no details — infer a plausible software product and audit it." : null,
    QUALITY_SELF_CHECK,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const key = requireAnthropicKey(req);
  if (isNextResponse(key)) return key;

  const body = await parseJsonBody<{ url?: string; description?: string; audience?: string }>(req);
  if (isNextResponse(body)) return body;

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: AUDIT_SYSTEM,
      output_config: { format: { type: "json_schema", schema: AUDIT_SCHEMA } },
      messages: [
        { role: "user", content: userPrompt(body.url, body.description, body.audience) },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("The model returned no audit.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Audit failed. Try again.");
  }
}
