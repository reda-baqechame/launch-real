const baseUrl = process.env.LAUNCHREEL_E2E_BASE_URL || "http://127.0.0.1:3000";
const sentinelUser = "launchreel-sentinel@example.test";
const sentinelPassword = "launchreel-secret-sentinel";

async function assertNoCredentialSentinel(page) {
  const leaked = await page.evaluate(
    async ({ user, password }) => {
      const needles = [user, password];
      const localValues = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        localValues.push(`${key}:${key ? localStorage.getItem(key) : ""}`);
      }
      const haystacks = localValues;

      const db = await new Promise((resolve) => {
        const request = indexedDB.open("launchreel-footage");
        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result);
      });
      if (db) {
        for (const storeName of Array.from(db.objectStoreNames)) {
          const records = await new Promise((resolve) => {
            const tx = db.transaction(storeName, "readonly");
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
          });
          for (const record of records) {
            const copy = { ...record, blob: record.blob ? `[blob:${record.blob.type}:${record.blob.size}]` : undefined };
            haystacks.push(JSON.stringify(copy));
          }
        }
        db.close();
      }
      return needles.some((needle) => haystacks.some((value) => value.includes(needle)));
    },
    { user: sentinelUser, password: sentinelPassword },
  );
  if (leaked) throw new Error("Credential sentinel leaked into browser persistence.");
}

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !text.startsWith("Failed to load resource:")) {
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    const cfg = await (await page.request.get(`${baseUrl}/api/public-config`)).json();
    if (!cfg.localFree) throw new Error("Expected local free mode for agent smoke.");

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      localStorage.clear();
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase("launchreel-footage");
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => resolve(undefined);
        request.onblocked = () => resolve(undefined);
      });
    });

    await page.goto(`${baseUrl}/new`, { waitUntil: "networkidle" });
    await page.fill("#app-url", "https://example.com");
    await page.fill(
      "#product-description",
      "LaunchReel turns product URLs and demos into narrated launch videos and shareable launch kits.",
    );
    await page.getByRole("button", { name: "Give agent access" }).click();
    await page.getByRole("button", { name: "Explore URL with agent" }).click();
    await page.getByLabel("Demo goal").fill("Show the core workflow and final payoff for a launch video.");
    await page.getByLabel("Extra instructions").fill("Use the visible page content and avoid external navigation.");
    await page.getByRole("textbox", { name: /^Avoid$/ }).fill("billing, destructive actions, real payments");
    await page.getByRole("textbox", { name: /^Stop when$/ }).fill("The payoff or main value proposition is visible.");
    await page.getByLabel("Test login email or username").fill(sentinelUser);
    await page.getByLabel("Test password").fill(sentinelPassword);
    await page.getByRole("button", { name: "Plan demo" }).click();
    await page.getByText("Demo plan", { exact: false }).waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Explore & record" }).click();
    await page.waitForURL(/\/projects\/[^/]+\/audit/, { timeout: 30000 });

    const projectId = page.url().match(/\/projects\/([^/]+)\//)?.[1];
    if (!projectId) throw new Error("Could not read generated project id.");

    await page.getByRole("link", { name: /Choose your angle/i }).click();
    await page.waitForURL(/\/angle/, { timeout: 15000 });
    await page.getByRole("link", { name: /Use this angle/i }).click();
    await page.waitForURL(/\/moments/, { timeout: 15000 });
    await page.getByRole("button", { name: /Make the launch kit/i }).click();
    try {
      await page.waitForURL(/\/result/, { timeout: 90000 });
    } catch (err) {
      const body = await page.locator("body").innerText().catch(() => "");
      throw new Error(
        `Timed out waiting for result page. Current URL: ${page.url()}. Visible text: ${body.slice(0, 1200)}`,
        { cause: err },
      );
    }

    const resultBody = await page.locator("body").innerText();
    const required = ["Video", "Product Hunt", "Social Clips", "Copy", "Landing Page", "Share Page", "Analytics", "Localize"];
    for (const text of required) {
      if (!resultBody.includes(text)) throw new Error(`Missing result tab: ${text}`);
    }

    await page.goto(`${baseUrl}/share/${projectId}`, { waitUntil: "networkidle" });
    const shareBody = await page.locator("body").innerText();
    if (!shareBody.includes("LaunchReel") && !shareBody.includes("Made with LaunchReel")) {
      throw new Error("Share page did not render LaunchReel content.");
    }

    const tts = await page.request.post(`${baseUrl}/api/tts`, {
      data: { text: "LaunchReel local free narration smoke." },
    });
    if (!tts.ok()) throw new Error(`TTS smoke failed: ${tts.status()}`);
    const contentType = tts.headers()["content-type"] || "";
    if (!contentType.includes("audio")) throw new Error(`TTS did not return audio: ${contentType}`);

    await assertNoCredentialSentinel(page);

    if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
    console.log(JSON.stringify({ ok: true, projectId, baseUrl }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
