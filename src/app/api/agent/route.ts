import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AGENT_DRIVER_SYSTEM } from "@/lib/ai-prompts";
import { isNextResponse } from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { isLocalFreeRequest, localFreeAgentCapture } from "@/lib/local-free";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sameHostname, validatePublicHttpsUrl } from "@/lib/url-safety-server";
import { requireAuthUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ClickEvent {
  tMs: number;
  x: number;
  y: number;
}

interface AgentCredentials {
  username?: string;
  password?: string;
}

interface AgentCaptureRequest {
  url: string;
  contextLine: string;
  plan?: { steps: { goal: string; action: string }[]; stopWhen?: string };
  instructions?: string;
  goal?: string;
  avoid?: string[];
  stopWhen?: string;
  credentials?: AgentCredentials;
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

async function isAllowedAgentUrl(raw: string, startUrl: URL): Promise<boolean> {
  try {
    const nextUrl = await validatePublicHttpsUrl(raw);
    return sameHostname(startUrl, nextUrl);
  } catch {
    return false;
  }
}

async function installAgentRequestGate(context: BrowserContext, startUrl: URL) {
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:")) {
      await route.continue();
      return;
    }
    if (!(await isAllowedAgentUrl(url, startUrl))) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
}

async function pageStillAllowed(page: Page, startUrl: URL): Promise<boolean> {
  const currentUrl = page.url();
  return (
    currentUrl === "about:blank" ||
    currentUrl.startsWith("data:") ||
    currentUrl.startsWith("blob:") ||
    (await isAllowedAgentUrl(currentUrl, startUrl))
  );
}

async function tryAutoLogin(page: Page, credentials?: AgentCredentials): Promise<boolean> {
  const username = credentials?.username?.trim();
  const password = credentials?.password;
  if (!username || !password) return false;

  const userSelectors = [
    "input[type='email']",
    "input[name*='email' i]",
    "input[id*='email' i]",
    "input[name*='user' i]",
    "input[id*='user' i]",
    "input[autocomplete='username']",
  ];
  const passSelectors = [
    "input[type='password']",
    "input[name*='password' i]",
    "input[id*='password' i]",
    "input[autocomplete='current-password']",
  ];
  const submitSelectors = [
    "button[type='submit']",
    "input[type='submit']",
    "button:has-text('Sign in')",
    "button:has-text('Log in')",
    "button:has-text('Login')",
    "button:has-text('Continue')",
  ];

  try {
    const userInput = page.locator(userSelectors.join(",")).first();
    const passInput = page.locator(passSelectors.join(",")).first();
    if ((await userInput.count()) === 0 || (await passInput.count()) === 0) return false;
    if (!(await userInput.isVisible({ timeout: 1500 })) || !(await passInput.isVisible({ timeout: 1500 }))) {
      return false;
    }
    await userInput.fill(username, { timeout: 3000 });
    await passInput.fill(password, { timeout: 3000 });

    const submit = page.locator(submitSelectors.join(",")).first();
    if ((await submit.count()) > 0 && (await submit.isVisible({ timeout: 1000 }))) {
      await Promise.allSettled([
        page.waitForLoadState("domcontentloaded", { timeout: 8000 }),
        submit.click({ timeout: 3000 }),
      ]);
    } else {
      await passInput.press("Enter", { timeout: 3000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    }
    await page.waitForTimeout(1200);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!rateLimit(`agent:${clientIp(req)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many agent requests. Try again shortly." }, { status: 429 });
  }

  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeAgentCapture());
  }

  if (process.env.NODE_ENV === "production") {
    const userId = await requireAuthUserId();
    if (isNextResponse(userId)) return userId;
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  let body: AgentCaptureRequest;
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
  let failureReason: string | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    let storageState: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
    if (body.credentials?.username?.trim() && body.credentials.password) {
      const loginContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await installAgentRequestGate(loginContext, startUrl);
      try {
        const loginPage = await loginContext.newPage();
        await loginPage.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });
        await tryAutoLogin(loginPage, body.credentials);
        if (await pageStillAllowed(loginPage, startUrl)) {
          storageState = await loginContext.storageState();
        } else {
          partial = true;
          failureReason = "Login navigated outside the allowed app host.";
        }
      } finally {
        await loginContext.close();
      }
    }

    const context = await browser.newContext({
      recordVideo: { dir: sessionDir, size: { width: 1280, height: 720 } },
      viewport: { width: 1280, height: 720 },
      storageState,
    });
    await installAgentRequestGate(context, startUrl);
    const page = await context.newPage();
    const client = new Anthropic({ apiKey: key });

    await page.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    const planText =
      body.plan?.steps.map((s, i) => `${i + 1}. ${s.goal}: ${s.action}`).join("\n") ??
      body.goal ??
      "Explore the product and show the core feature.";
    const stopWhen = body.stopWhen ?? body.plan?.stopWhen;

    for (let i = 0; i < 10; i++) {
      if (Date.now() - startMs > 85000) break;
      if (!(await pageStillAllowed(page, startUrl))) {
        partial = true;
        failureReason = "The browser left the allowed app host.";
        break;
      }

      const shot = await page.screenshot({ type: "jpeg", quality: 60 });
      screenshots.push(shot.toString("base64"));

      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1000,
        system: AGENT_DRIVER_SYSTEM(planText, body.contextLine, stopWhen),
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
        failureReason = "The browser action failed before the full plan completed.";
        break;
      }

      if (action.done) break;

      try {
        if (action.action === "goto" && action.url) {
          const nextUrl = await validatePublicHttpsUrl(action.url);
          if (!sameHostname(startUrl, nextUrl)) {
            partial = true;
            failureReason = "The browser tried to leave the allowed app host.";
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
        failureReason = "The browser action failed before the full plan completed.";
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
  } catch (e) {
    partial = true;
    failureReason = e instanceof Error ? e.message : "Agent capture failed.";
  }

  await browser?.close().catch(() => {});
  await rm(sessionDir, { recursive: true, force: true }).catch(() => {});

  if (!videoBase64 && screenshots.length === 0) {
    return NextResponse.json(
      { error: "Agent could not capture this app. Try uploading a recording instead." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    captureMode: videoBase64 ? "video" : "screenshots",
    videoBase64,
    clicks,
    screenshots,
    partial,
    failureReason,
    mimeType: "video/webm",
  });
}
