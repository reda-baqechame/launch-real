import Anthropic from "@anthropic-ai/sdk";
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { FULL_OPERATOR_SYSTEM } from "@/lib/ai-prompts";
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
  ownerUserId?: string;
  approvedRiskKinds?: string[];
  accountMode?: "none" | "use_provided" | "create_disposable";
  disposableEmailDomain?: string;
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
    observation: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["done", "reason"],
} as const;

function riskyActionKind(input: { action?: string; selector?: string; text?: string; url?: string; reason?: string }): string | null {
  const value = [input.action, input.selector, input.text, input.url, input.reason].filter(Boolean).join(" ").toLowerCase();
  if (/\b(pay|payment|checkout|subscribe|purchase|billing|invoice)\b/.test(value)) return "payment";
  if (/\b(delete|remove|destroy|archive|deactivate|close account)\b/.test(value)) return "destructive";
  if (/\b(post|publish|upload|download|oauth|connect google|connect youtube|authorize)\b/.test(value)) return "external_side_effect";
  if (/\b(settings|password|email|account|profile|team|member|permission)\b/.test(value)) return "account_change";
  if (/\b(sign up|signup|create account|register)\b/.test(value)) return "account_creation";
  return null;
}

function redactForTrace(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(password|token|secret|api[_ -]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

async function pageEvidence(page: Page): Promise<string> {
  const title = await page.title().catch(() => "");
  const body = await page.locator("body").innerText({ timeout: 1500 }).catch(() => "");
  const compact = body.replace(/\s+/g, " ").slice(0, 2500);
  return redactForTrace(`Title: ${title}\nVisible text: ${compact}`);
}

function generatedDisposableCredentials(input: OperatorJobRequest): OperatorCredentials | null {
  if (input.accountMode !== "create_disposable") return null;
  const domain = input.disposableEmailDomain?.trim() || "example.test";
  return {
    username: `launchreel-${Date.now().toString(36)}@${domain}`,
    password: `LR-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
  };
}

function credentialPrompt(input: OperatorJobRequest, runCredentials?: OperatorCredentials | null): string {
  if (!runCredentials?.username || !runCredentials.password) return "No credentials are available. Do not attempt login or signup unless the app is usable without it.";
  const mode =
    input.accountMode === "create_disposable"
      ? "A disposable test account may be created if account_creation is approved by the request."
      : "Disposable/provided test credentials are available for login if needed.";
  return [
    mode,
    "When filling username or email fields, return text exactly __LAUNCHREEL_USERNAME__.",
    "When filling password fields, return text exactly __LAUNCHREEL_PASSWORD__.",
    "Never write the real password or tokens in observations, reasons, URLs, reports, or narration.",
  ].join(" ");
}

function actionFillText(text: string | undefined, runCredentials?: OperatorCredentials | null): string | undefined {
  if (!text) return text;
  return text
    .replaceAll("__LAUNCHREEL_USERNAME__", runCredentials?.username ?? "")
    .replaceAll("__LAUNCHREEL_PASSWORD__", runCredentials?.password ?? "");
}

function parseOperatorAction(raw: string): {
  done: boolean;
  action?: string;
  selector?: string;
  text?: string;
  url?: string;
  reason: string;
  observation?: string;
  confidence?: number;
} {
  const trimmed = raw.trim();
  const json = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Operator model did not return JSON.");
  const parsed = JSON.parse(json) as {
    done?: boolean;
    action?: string;
    selector?: string;
    text?: string;
    url?: string;
    reason?: string;
    observation?: string;
    confidence?: number;
  };
  return {
    ...parsed,
    done: Boolean(parsed.done),
    reason: parsed.reason?.trim() || "Continue the approved product demo path.",
    observation: parsed.observation?.trim(),
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : undefined,
  };
}

function buildOperatorArtifacts(job: OperatorJob): Pick<OperatorJob, "appUnderstanding" | "editorBrief"> {
  const host = (() => {
    try {
      return new URL(job.url).hostname;
    } catch {
      return "the supplied app";
    }
  })();
  const doneEntries = job.actionLedger.filter((entry) => entry.status === "done");
  const observations = doneEntries
    .map((entry) => entry.observation || entry.reason)
    .filter(Boolean)
    .map((text) => redactForTrace(text))
    .slice(0, 6);
  const bestMoments = doneEntries
    .filter((entry) => /click|goto|fill|scroll|wait|stop|observe/i.test(entry.action))
    .slice(0, 5)
    .map((entry) => `Step ${entry.step}: ${redactForTrace(entry.observation || entry.reason)}`);

  return {
    appUnderstanding: {
      category: observations.find((text) => /dashboard|project|launch|video|editor|analytics|workspace/i.test(text)) || "Software product demo",
      audience: job.contextLine || "Product builders and launch teams",
      valueProp: observations[0] || job.goal,
      keyScreens: observations.length ? observations : [job.url],
    },
    editorBrief: {
      title: `Demo of ${host}`,
      narrativeArc: `Open with the user goal, show the shortest credible workflow, then finish on the clearest visible payoff: ${job.stopWhen}`,
      voiceDirection: "Confident, human, specific, and calm. Describe only what is visible on screen.",
      suggestedCaptions: [
        job.goal,
        observations[0] || "The product value becomes visible.",
        job.stopWhen,
      ].map(redactForTrace),
      bestMoments: bestMoments.length ? bestMoments : [`Step 1: ${job.goal}`],
    },
  };
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
    ownerUserId: input.ownerUserId,
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
    {
      step: 1,
      action: "goto",
      url: input.url,
      reason: "Load the supplied app URL.",
      observation: "The app opens in the browser capture lane.",
      confidence: 1,
      status: "done",
      tMs: 100,
    },
    {
      step: 2,
      action: "observe",
      reason: job.goal,
      observation: "The operator identifies the likely value path and avoids billing, destructive, and external side effects.",
      confidence: 0.94,
      status: "done",
      tMs: 700,
    },
    {
      step: 3,
      action: "stop",
      reason: job.stopWhen,
      observation: "The local-free fixture has enough replayable evidence to generate narration, captions, and launch assets.",
      confidence: 0.96,
      status: "done",
      tMs: 1200,
    },
  ];
  job.screenshots = ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="];
  job.traceSummary = "Local-free operator fixture completed a deterministic deep-demo path.";
  job.finalReport = `Operator completed local-free demo for ${input.url}. Goal: ${job.goal}.`;
  Object.assign(job, buildOperatorArtifacts(job));
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
  const generatedCredentials = generatedDisposableCredentials(input);
  const runCredentials =
    input.accountMode === "create_disposable"
      ? generatedCredentials
      : input.accountMode === "none"
        ? null
        : input.credentials;
  const approvedRiskKinds = new Set(job.approvedRiskKinds);
  if (input.accountMode === "create_disposable") approvedRiskKinds.add("account_creation");

  try {
    job.status = "running";
    job.traceSummary = "Browser operator started.";
    await saveOperatorJob(job);

    browser = await chromium.launch({ headless: true });
    let storageState: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
    if (runCredentials?.username?.trim() && runCredentials.password) {
      const loginContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await installOperatorGate(loginContext, startUrl, job.networkLog);
      try {
        const loginPage = await loginContext.newPage();
        await loginPage.goto(startUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });
        await tryAutoLogin(loginPage, runCredentials);
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
      `Account mode: ${input.accountMode || (runCredentials ? "use_provided" : "none")}. ${credentialPrompt(input, runCredentials)}`,
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
      const evidence = await pageEvidence(page);
      job.screenshots.push(shot.toString("base64"));
      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1200,
        system: FULL_OPERATOR_SYSTEM(planText, job.contextLine, job.stopWhen),
        output_config: { format: { type: "json_schema", schema: OPERATOR_ACTION_SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Operator step ${i + 1}. Current URL: ${page.url()}.`,
                  "Visible page evidence:",
                  evidence,
                  "Return the next safe action. Use credential tokens only when filling login/signup fields.",
                ].join("\n"),
              },
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: shot.toString("base64") } },
            ],
          },
        ],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") break;
      const action = parseOperatorAction(textBlock.text);
      const risk = riskyActionKind(action);
      if (risk && !approvedRiskKinds.has(risk)) {
        const approval: OperatorApprovalRequest = {
          id: `approval_${i + 1}`,
          step: i + 1,
          risk,
          reason: redactForTrace(action.reason),
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
      if (action.done) {
        job.actionLedger.push({
          step: i + 1,
          action: "stop",
          reason: redactForTrace(action.reason),
          observation: action.observation ? redactForTrace(action.observation) : undefined,
          confidence: action.confidence,
          status: "done",
          tMs: Date.now() - started,
        });
        break;
      }

      const entry: OperatorActionEntry = {
        step: i + 1,
        action: action.action ?? "wait",
        selector: action.selector,
        url: action.url,
        reason: redactForTrace(action.reason),
        observation: action.observation ? redactForTrace(action.observation) : undefined,
        confidence: action.confidence,
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
          const fillText = actionFillText(action.text, runCredentials);
          if (!fillText) throw new Error("Operator requested a credential fill without available credentials.");
          await page.locator(action.selector).first().fill(fillText, { timeout: 5000 });
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
    Object.assign(job, buildOperatorArtifacts(job));
    job.finalReport = [
      `Goal: ${job.goal}`,
      `Steps completed: ${job.actionLedger.filter((a) => a.status === "done").length}/${job.actionLedger.length}`,
      `Network blocked: ${job.networkLog.filter((n) => n.status === "blocked").length}`,
      job.appUnderstanding ? `App: ${job.appUnderstanding.valueProp}` : "",
      job.editorBrief ? `Editor brief: ${job.editorBrief.narrativeArc}` : "",
      job.failureReason ? `Failure: ${job.failureReason}` : "Failure: none",
    ].filter(Boolean).join("\n");
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
