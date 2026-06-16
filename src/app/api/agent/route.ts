import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AGENT_DRIVER_SYSTEM } from "@/lib/ai-prompts";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sameHostname, validatePublicHttpsUrl } from "@/lib/url-safety-server";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ClickEvent {
  tMs: number;
  x: number;
  y: number;
}

const ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    done: { type: "boolean" },
    action: {
      type: "string",
      enum: ["click", "fill", "goto", "wait", "scroll"],
    },
    selector: { type: "string" },
    text: { type: "string" },
    url: { type: "string" },
    reason: { type: "string" },
  },
  required: ["done", "reason"],
} as const;

export async function POST(req: Request) {
  if (!rateLimit(`agent:${clientIp(req)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many agent requests. Try again shortly." }, { status: 429 });
  }

  const key = req.headers.get("x-anthropic-key");
  if (!key) {
    return NextResponse.json({ error: "No Anthropic key." }, { status: 400 });
  }

  let body: {
    url: string;
    contextLine: string;
    plan?: { steps: { goal: string; action: string }[] };
    instructions?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  let startUrl: URL;
  try {
    startUrl = await validatePublicHttpsUrl(body.url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL not allowed." },
      { status: 400 },
    );
  }

  const sessionDir = join(tmpdir(), `launchreel-agent-${Date.now()}`);
  await mkdir(sessionDir, { recursive: true });
  const clicks: ClickEvent[] = [];
  const screenshots: string[] = [];
  const startMs = Date.now();
  let videoBase64: string | null = null;
  let partial = false;

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      recordVideo: { dir: sessionDir, size: { width: 1280, height: 720 } },
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const client = new Anthropic({ apiKey: key });

    await page.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    const planText =
      body.plan?.steps.map((s, i) => `${i + 1}. ${s.goal}: ${s.action}`).join("\n") ??
      "Explore the product and show the core feature.";

    for (let i = 0; i < 10; i++) {
      if (Date.now() - startMs > 85000) break;

      const shot = await page.screenshot({ type: "jpeg", quality: 60 });
      screenshots.push(shot.toString("base64"));

      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1000,
        system: AGENT_DRIVER_SYSTEM(planText, body.contextLine),
        output_config: { format: { type: "json_schema", schema: ACTION_SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Step ${i + 1}. Current URL: ${page.url()}. What next?` },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: shot.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") break;
      let action: {
        done: boolean;
        action?: string;
        selector?: string;
        text?: string;
        url?: string;
      };
      try {
        action = JSON.parse(textBlock.text) as {
          done: boolean;
          action?: string;
          selector?: string;
          text?: string;
          url?: string;
        };
      } catch {
        partial = true;
        break;
      }

      if (action.done) break;

      try {
        if (action.action === "goto" && action.url) {
          const nextUrl = await validatePublicHttpsUrl(action.url);
          if (!sameHostname(startUrl, nextUrl)) {
            partial = true;
            break;
          }
          await page.goto(nextUrl.href, { waitUntil: "domcontentloaded", timeout: 15000 });
        } else if (action.action === "click" && action.selector) {
          const el = page.locator(action.selector).first();
          const box = await el.boundingBox();
          await el.click({ timeout: 5000 });
          if (box) {
            clicks.push({
              tMs: Date.now() - startMs,
              x: (box.x + box.width / 2) / 1280,
              y: (box.y + box.height / 2) / 720,
            });
          }
        } else if (action.action === "fill" && action.selector && action.text) {
          await page.locator(action.selector).first().fill(action.text, { timeout: 5000 });
        } else if (action.action === "scroll") {
          await page.mouse.wheel(0, 400);
        } else {
          await page.waitForTimeout(800);
        }
      } catch {
        partial = true;
        break;
      }
      await page.waitForTimeout(600);
    }

    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const buf = await readFile(videoPath);
      videoBase64 = buf.toString("base64");
    }
  } catch {
    partial = true;
  }

  await rm(sessionDir, { recursive: true, force: true }).catch(() => {});

  if (!videoBase64 && screenshots.length === 0) {
    return NextResponse.json(
      { error: "Agent could not capture this app. Try uploading a recording instead." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    videoBase64,
    clicks,
    screenshots,
    partial,
    mimeType: "video/webm",
  });
}
