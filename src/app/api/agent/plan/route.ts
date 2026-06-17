import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { handleAnthropicError, isNextResponse } from "@/lib/api-helpers";
import { AGENT_PLAN_SYSTEM } from "@/lib/ai-prompts";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { isLocalFreeRequest, localFreeAgentPlan } from "@/lib/local-free";
import { requireAuthUserId } from "@/lib/auth";

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
    stopWhen: { type: "string" },
  },
  required: ["steps", "avoid", "stopWhen"],
} as const;

interface AgentPlanRequest {
  url: string;
  contextLine: string;
  instructions?: string;
  goal?: string;
  avoid?: string[];
  stopWhen?: string;
  hasCredentials?: boolean;
  credentials?: { username?: string; password?: string };
}

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    let body: AgentPlanRequest | null = null;
    try {
      body = (await req.json()) as AgentPlanRequest;
    } catch {
      /* Local free mode can still return a deterministic plan. */
    }
    return NextResponse.json(localFreeAgentPlan(body ?? undefined));
  }

  if (process.env.NODE_ENV === "production") {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  let body: AgentPlanRequest;
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
          content: [
            `URL: ${body.url}`,
            `Product: ${body.contextLine}`,
            body.goal ? `Demo goal: ${body.goal}` : null,
            body.instructions ? `Instructions: ${body.instructions}` : null,
            body.avoid?.length ? `Avoid: ${body.avoid.join(", ")}` : null,
            body.stopWhen ? `Stop when: ${body.stopWhen}` : null,
            body.hasCredentials || body.credentials?.username || body.credentials?.password
              ? "Disposable test credentials are available to the browser automation, but do not include their values in the plan."
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
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
