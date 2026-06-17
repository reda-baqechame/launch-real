import Anthropic from "@anthropic-ai/sdk";
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AGENT_DRIVER_SYSTEM } from "@/lib/ai-prompts";
import { sameHostname, validatePublicHttpsUrl } from "@/lib/url-safety-server";
import {
  operatorJobId,
  saveOperatorJob,
  type OperatorActionEntry,
  type OperatorApprovalRequest,
  type OperatorJob,
} from "@/lib/agent-operator-store";

export interface OperatorCredentials {
  username?: string;
  password?: string;
}

export interface OperatorJobRequest {
  url: string;
  contextLine: string;
  goal?: string;
  instructions?: string;
  avoid?: string[];
  stopWhen?: string;
  credentials?: OperatorCredentials;
  approvedRiskKinds?: string[];
  maxSteps?: number;
}

const OPERATOR_ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    done: { type: "boolean" },
    action: { type: "string", enum: ["click", "fill", "goto", "wait", "scroll"] },
    selector: { type: "string" },
    text: { type: "string" },
    url: { type: "string" },
    reason: { type: "string" },
  },
  required: ["done", "reason"],
} as const;

function riskyActionKind(input: { action?: string; selector?: string; text?: string; url?: string; reason?: string }): string | null {
  const value = [input.action, input.selector, input.text, input.url, input.reason].filter(Boolean).join(" ").toLowerCase();
  if (/\b(pay|payment|checkout|subscribe|purchase|billing|invoice)\b/.test(value)) return "payment";
  if (/\b(delete|remove|destroy|archive|deactivate|close account)\b/.test(value)) return "destructive";
  if (/\b(post|publish|upload|download|oauth|connect google|connect youtube|authorize)\b/.test(value)) return "external_side_effect";
  if (/\b(settings|password|email|account|profile|team|member|permission)\b/.test(value)) return "account_change";
  return null;
}

async function isAllowedOperatorUrl(raw: string, startUrl: URL): Promise<boolean> {
  try {
    const nextUrl = await validatePublicHttpsUrl(raw);
    return sameHostname(startUrl, nextUrl);
  } catch {
    return false;
  }
}

async function installOperatorGate(
  context: BrowserContext,
  startUrl: URL,
  networkLog: OperatorJob["networkLog"],
) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    if (url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:")) {
      await route.continue();
      return;
    }
    if (!(await isAllowedOperatorUrl(url, startUrl))) {
      networkLog.push({ url, method: req.method(), status: "blocked", reason: "outside allowed app host or private network" });
      await route.abort("blockedbyclient");
      return;
    }
    networkLog.push({ url, method: req.method(), status: "allowed" });
    await route.continue();
  });
}

async function tryAutoLogin(page: Page, credentials?: OperatorCredentials): Promise<boolean> {
  const username = credentials?.username?.trim();
  const password = credentials?.password;
  if (!username || !password) return false;
  try {
    const userInput = page
      .locator([
        "input[type='email']",
        "input[name*='email' i]",
        "input[id*='email' i]",
        "input[name*='user' i]",
        "input[id*='user' i]",
        "input[autocomplete='username']",
      ].join(","))
      .first();
    const passInput = page
      .locator([
        "input[type='password']",
        "input[name*='password' i]",
        "input[id*='password' i]",
        "input[autocomplete='current-password']",
      ].join(","))
      .first();
    if ((await userInput.count()) === 0 || (await passInput.count()) === 0) return false;
    if (!(await userInput.isVisible({ timeout: 1500 })) || !(await passInput.isVisible({ timeout: 1500 }))) return false;
    await userInput.fill(username, { timeout: 3000 });
    await passInput.fill(password, { timeout: 3000 });
    const submit = page
      .locator(["button[type='submit']", "input[type='submit']", "button:has-text('Sign in')", "button:has-text('Log in')", "button:has-text('Continue')"].join(","))
      .first();
    if ((await submit.count()) > 0 && (await submit.isVisible({ timeout: 1000 }))) {
      await Promise.allSettled([page.waitForLoadState("domcontentloaded", { timeout: 8000 }), submit.click({ timeout: 3000 })]);
    } else {
      await passInput.press("Enter", { timeout: 3000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
    return true;
  } catch {
    return false;
  }
}

function makeBaseJob(input: OperatorJobRequest): OperatorJob {
  const now = new Date().toISOString();
  return {
    id: operatorJobId(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    url: input.url,
    contextLine: input.contextLine,
    goal: input.goal?.trim() || "Complete a deep product demo and stop on the strongest payoff.",
    instructions: input.instructions,
    avoid: input.avoid?.filter(Boolean) ?? ["billing", "delete", "real payments"],
    stopWhen: input.stopWhen?.trim() || "The app's main payoff is visible and understandable.",
    captureMode: "screenshots",
    partial: false,
    actionLedger: [],
    networkLog: [],
    screenshots: [],
    clicks: [],
    approvalRequests: [],
    approvedRiskKinds: input.approvedRiskKinds ?? [],
    traceSummary: "Queued.",
  };
}

export async function runLocalFreeOperatorJob(input: OperatorJobRequest): Promise<OperatorJob> {
  const job = makeBaseJob(input);
  job.status = "succeeded";
  job.actionLedger = [
    { step: 1, action: "goto", url: input.url, reason: "Load the supplied app URL.", status: "done", tMs: 100 },
    { step: 2, action: "observe", reason: job.goal, status: "done", tMs: 700 },
    { step: 3, action: "stop", reason: job.stopWhen, status: "done", tMs: 1200 },
  ];
  job.screenshots = ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="];
  job.traceSummary = "Local-free operator fixture completed a deterministic deep-demo path.";
  job.finalReport = `Operator completed local-free demo for ${input.url}. Goal: ${job.goal}.`;
  job.updatedAt = new Date().toISOString();
  await saveOperatorJob(job);
  return job;
}

export async function runOperatorJob(input: OperatorJobRequest, anthropicKey: string): Promise<OperatorJob> {
  const job = makeBaseJob(input);
  const startUrl = await validatePublicHttpsUrl(input.url);
  const sessionDir = join(tmpdir(), `launchreel-operator-${job.id}`);
  await mkdir(sessionDir, { recursive: true });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const started = Date.now();

  try {
    job.status = "running";
    job.traceSummary = "Browser operator started.";
    await saveOperatorJob(job);

    browser = await chromium.launch({ headless: true });
    let storageState: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
    if (input.credentials?.username?.trim() && input.credentials.password) {
      const loginContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await installOperatorGate(loginContext, startUrl, job.networkLog);
      try {
        const loginPage = await loginContext.newPage();
        await loginPage.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });
        await tryAutoLogin(loginPage, input.credentials);
        storageState = await loginContext.storageState();
      } finally {
        await loginContext.close();
      }
    }

    const context = await browser.newContext({
      recordVideo: { dir: sessionDir, size: { width: 1280, height: 720 } },
      viewport: { width: 1280, height: 720 },
      storageState,
    });
    await installOperatorGate(context, startUrl, job.networkLog);
    const page = await context.newPage();
    const client = new Anthropic({ apiKey: anthropicKey });
    await page.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });

    const planText = [
      `Goal: ${job.goal}`,
      input.instructions ? `Instructions: ${input.instructions}` : "",
      job.avoid.length ? `Avoid: ${job.avoid.join(", ")}` : "",
      `Approval required for payment, destructive, external publishing/upload/download/OAuth, or account-change actions.`,
    ].filter(Boolean).join("\n");

    const maxSteps = Math.min(Math.max(input.maxSteps ?? 20, 1), 40);
    for (let i = 0; i < maxSteps; i++) {
      if (Date.now() - started > 240_000) {
        job.partial = true;
        job.failureReason = "Operator reached the session time limit.";
        break;
      }
      if (!(await isAllowedOperatorUrl(page.url(), startUrl))) {
        job.partial = true;
        job.failureReason = "Operator left the allowed app host.";
        break;
      }

      const shot = await page.screenshot({ type: "jpeg", quality: 58 });
      job.screenshots.push(shot.toString("base64"));
      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1200,
        system: AGENT_DRIVER_SYSTEM(planText, job.contextLine, job.stopWhen),
        output_config: { format: { type: "json_schema", schema: OPERATOR_ACTION_SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Operator step ${i + 1}. Current URL: ${page.url()}. Return the next safe action.` },
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: shot.toString("base64") } },
            ],
          },
        ],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") break;
      const action = JSON.parse(textBlock.text) as { done: boolean; action?: string; selector?: string; text?: string; url?: string; reason: string };
      const risk = riskyActionKind(action);
      if (risk && !job.approvedRiskKinds.includes(risk)) {
        const approval: OperatorApprovalRequest = {
          id: `approval_${i + 1}`,
          step: i + 1,
          risk,
          reason: action.reason,
          action: action.action ?? "unknown",
          createdAt: new Date().toISOString(),
        };
        job.approvalRequests.push(approval);
        job.status = "needs_approval";
        job.traceSummary = `Paused for ${risk} approval at step ${i + 1}.`;
        await saveOperatorJob(job);
        await context.close();
        return job;
      }
      if (action.done) break;

      const entry: OperatorActionEntry = {
        step: i + 1,
        action: action.action ?? "wait",
        selector: action.selector,
        url: action.url,
        reason: action.reason,
        status: "planned",
        tMs: Date.now() - started,
      };
      try {
        if (action.action === "goto" && action.url) {
          const nextUrl = await validatePublicHttpsUrl(action.url);
          if (!sameHostname(startUrl, nextUrl)) throw new Error("Navigation outside allowed host.");
          await page.goto(nextUrl.href, { waitUntil: "domcontentloaded", timeout: 15000 });
        } else if (action.action === "click" && action.selector) {
          const el = page.locator(action.selector).first();
          const box = await el.boundingBox();
          await el.click({ timeout: 5000 });
          if (box) job.clicks.push({ tMs: Date.now() - started, x: (box.x + box.width / 2) / 1280, y: (box.y + box.height / 2) / 720 });
        } else if (action.action === "fill" && action.selector && action.text) {
          await page.locator(action.selector).first().fill(action.text, { timeout: 5000 });
        } else if (action.action === "scroll") {
          await page.mouse.wheel(0, 650);
        } else {
          await page.waitForTimeout(900);
        }
        entry.status = "done";
      } catch (e) {
        entry.status = "failed";
        job.partial = true;
        job.failureReason = e instanceof Error ? e.message : "Operator action failed.";
      }
      job.actionLedger.push(entry);
      await saveOperatorJob(job);
      if (entry.status === "failed") break;
      await page.waitForTimeout(600);
    }

    const video = page.video();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      job.videoBase64 = (await readFile(videoPath)).toString("base64");
      job.captureMode = "video";
    }
    job.status = job.partial ? "failed" : "succeeded";
    job.traceSummary = job.partial ? "Operator stopped with partial output." : "Operator completed the requested app task.";
    job.finalReport = [
      `Goal: ${job.goal}`,
      `Steps completed: ${job.actionLedger.filter((a) => a.status === "done").length}/${job.actionLedger.length}`,
      `Network blocked: ${job.networkLog.filter((n) => n.status === "blocked").length}`,
      job.failureReason ? `Failure: ${job.failureReason}` : "Failure: none",
    ].join("\n");
  } catch (e) {
    job.status = "failed";
    job.partial = true;
    job.failureReason = e instanceof Error ? e.message : "Operator failed.";
    job.traceSummary = "Operator failed before completion.";
  } finally {
    job.updatedAt = new Date().toISOString();
    await browser?.close().catch(() => {});
    await rm(sessionDir, { recursive: true, force: true }).catch(() => {});
    await saveOperatorJob(job);
  }
  return job;
}
