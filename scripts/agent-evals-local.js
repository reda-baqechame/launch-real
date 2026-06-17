const baseUrl = process.env.LAUNCHREEL_EVAL_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  async function pass(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  try {
    const cfg = await (await page.request.get(`${baseUrl}/api/public-config`)).json();
    if (!cfg.localFree) throw new Error("Agent evals require local-free mode.");

    await pass("operator job creates replayable local-free trace", async () => {
      const res = await page.request.post(`${baseUrl}/api/agent/jobs`, {
        data: {
          url: "https://example.com",
          contextLine: "LaunchReel eval target",
          goal: "Show the app value without using billing.",
          avoid: ["billing", "delete", "real payments"],
          stopWhen: "The value proposition is visible.",
          credentials: { username: "eval-sentinel@example.test", password: "eval-secret-sentinel" },
          accountMode: "use_provided",
        },
      });
      if (!res.ok()) throw new Error(`operator job failed: ${res.status()}`);
      const job = await res.json();
      if (!job.id || job.status !== "succeeded") throw new Error(`unexpected job status: ${job.status}`);
      if (!Array.isArray(job.actionLedger) || job.actionLedger.length < 2) throw new Error("missing action ledger");
      if (!job.traceSummary || !job.finalReport) throw new Error("missing operator report");
      if (!job.actionLedger.some((entry) => entry.observation && typeof entry.confidence === "number")) {
        throw new Error("missing operator observations/confidence");
      }
      if (!job.appUnderstanding?.valueProp || !job.editorBrief?.narrativeArc) {
        throw new Error("missing app understanding or editor brief");
      }
      const leaked = JSON.stringify(job).includes("eval-secret-sentinel");
      if (leaked) throw new Error("credential sentinel leaked into job response");
    });

    await pass("operator supports disposable account mode without persisting generated password", async () => {
      const res = await page.request.post(`${baseUrl}/api/agent/jobs`, {
        data: {
          url: "https://example.com",
          contextLine: "disposable account eval",
          goal: "Discover the app path with a disposable account if needed.",
          stopWhen: "The demo can continue safely.",
          accountMode: "create_disposable",
          disposableEmailDomain: "example.test",
        },
      });
      if (!res.ok()) throw new Error(`disposable operator failed: ${res.status()}`);
      const job = await res.json();
      if (JSON.stringify(job).includes("LR-")) throw new Error("generated disposable password leaked");
      if (!job.editorBrief?.bestMoments?.length) throw new Error("missing editor best moments");
    });

    await pass("operator job can be read by id", async () => {
      const create = await page.request.post(`${baseUrl}/api/agent/jobs`, {
        data: { url: "https://example.com", contextLine: "read eval", goal: "read eval", stopWhen: "done" },
      });
      const job = await create.json();
      const read = await page.request.get(`${baseUrl}/api/agent/jobs/${job.id}`);
      if (!read.ok()) throw new Error(`read failed: ${read.status()}`);
      const readJob = await read.json();
      if (readJob.id !== job.id) throw new Error("read returned wrong job");
    });

    await pass("private network target is denied outside dev allowlist", async () => {
      const res = await page.request.post(`${baseUrl}/api/agent/jobs`, {
        data: { url: "http://169.254.169.254/latest/meta-data", contextLine: "ssrf eval", goal: "ssrf", stopWhen: "never" },
      });
      if (res.ok()) throw new Error("private network target unexpectedly allowed");
    });

    const failed = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
    if (failed.length) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
