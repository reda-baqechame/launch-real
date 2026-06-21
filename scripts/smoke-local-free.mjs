// Linux/CI-runnable smoke: boots `next dev` in local-free mode and asserts the
// API routes return their mock payloads. Replaces the Windows-only PowerShell
// smokes for CI. Run: `node scripts/smoke-local-free.mjs`.
import { spawn } from "node:child_process";

const PORT = process.env.SMOKE_PORT || "3010";
const BASE = `http://127.0.0.1:${PORT}`;
const H = { "content-type": "application/json", host: "localhost" };

function log(ok, name, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/public-config`, { headers: H });
      if (r.ok) return await r.json();
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start in time");
}

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

const checks = [
  ["/api/recap", { durationSec: 90 }, (j) => Array.isArray(j.chapters)],
  ["/api/seedance", { prompt: "x" }, (j) => j.status === "done"],
  ["/api/director", { frames: [{ tSec: 0, dataUrl: "data:image/jpeg;base64,AAAA" }] }, (j) => typeof j.total === "number"],
  ["/api/brand-extract", { url: "https://stripe.com" }, (j) => typeof j.logoText === "string"],
  ["/api/deck", { productName: "Acme" }, (j) => Array.isArray(j.slides)],
  ["/api/translate", { hook: "Hi", cta: "Go", lines: ["one"], language: "Spanish" }, (j) => Array.isArray(j.lines)],
  ["/api/avatar", {}, (j) => j.status === "done"],
];

async function main() {
  const server = spawn("npx", ["next", "dev", "-p", PORT], {
    env: { ...process.env, LAUNCHREEL_LOCAL_FREE_MODE: "1" },
    stdio: "ignore",
  });
  let failures = 0;
  try {
    const cfg = await waitForServer();
    if (cfg.localFree !== true) {
      log(false, "local-free enabled", JSON.stringify(cfg));
      failures++;
    } else {
      log(true, "local-free enabled");
    }
    for (const [path, body, assert] of checks) {
      try {
        const j = await post(path, body);
        const ok = assert(j);
        log(ok, path);
        if (!ok) failures++;
      } catch (e) {
        log(false, path, e.message);
        failures++;
      }
    }
  } catch (e) {
    log(false, "startup", e.message);
    failures++;
  } finally {
    server.kill("SIGTERM");
  }
  if (failures) {
    console.error(`\n${failures} smoke check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll local-free smoke checks passed.");
  process.exit(0);
}

main();
