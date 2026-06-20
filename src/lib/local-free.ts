import { NextResponse } from "next/server";
import type { RenderJob } from "@/lib/db/render-jobs";

export const LOCAL_FREE_USER_ID = "local-free-user";
export const LOCAL_FREE_CREDITS = 999_999;

export function isLocalHostName(host: string | null | undefined): boolean {
  if (!host) return false;
  const value = host.split(",")[0].trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname = value.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isLocalFreeEnvEnabled(): boolean {
  return /^(1|true|yes)$/i.test(process.env.LAUNCHREEL_LOCAL_FREE_MODE ?? "");
}

export function isLocalFreeAllowedForHost(host: string | null | undefined): boolean {
  return process.env.NODE_ENV !== "production" && isLocalFreeEnvEnabled() && isLocalHostName(host);
}

export function isLocalFreeRequest(req: Request): boolean {
  return isLocalFreeAllowedForHost(req.headers.get("host"));
}

export function localFreeAudit(input?: { url?: string; description?: string; audience?: string }) {
  const product = input?.description?.trim() || input?.url?.trim() || "this product";
  return {
    score: 91,
    strongestAngle: "Show the user going from messy launch work to a complete launch kit in one flow.",
    weakestPoint: "The current story needs one crisp before/after moment.",
    bestAudience: input?.audience || "Indie founders, product marketers, and small launch teams.",
    bestDemoMoment: "The generated launch kit appears with video, captions, Product Hunt copy, and share page ready.",
    recommendedHook: "Launch-ready in minutes",
    mainHook: "Turn product footage into a full launch kit",
    refinedOneLiner: `LaunchReel turns ${product} into videos, launch copy, and share assets without a production team.`,
    breakdown: [
      { label: "Hook clarity", value: 92 },
      { label: "Audience fit", value: 90 },
      { label: "Demo strength", value: 93 },
      { label: "Proof", value: 88 },
      { label: "Visual story", value: 91 },
      { label: "CTA", value: 89 },
      { label: "Differentiation", value: 90 },
      { label: "Launch readiness", value: 94 },
    ],
    criticism: [
      "Lead with the transformation before listing features.",
      "Show the best generated output earlier in the demo.",
    ],
  };
}

export function localFreeAnalyze(input?: { contextLine?: string }) {
  return {
    app_summary: input?.contextLine || "A product demo with a clear before, product magic, and launch-ready payoff.",
    moments: [
      {
        id: "local-m1",
        startSec: 0.5,
        endSec: 4,
        title: "Problem setup",
        role: "Problem setup",
        why: "Frames the launch work the viewer wants to avoid.",
        wow_score: 78,
        keepByDefault: true,
      },
      {
        id: "local-m2",
        startSec: 4,
        endSec: 9,
        title: "Product magic",
        role: "Magic moment",
        why: "Shows the product doing the work, not just describing it.",
        wow_score: 92,
        keepByDefault: true,
      },
      {
        id: "local-m3",
        startSec: 9,
        endSec: 14,
        title: "Launch kit payoff",
        role: "Payoff",
        why: "Connects the demo to a concrete finished launch asset.",
        wow_score: 88,
        keepByDefault: true,
      },
    ],
  };
}

export function localFreeScript(input?: {
  hook?: string;
  moments?: { id: string; title?: string; startSec?: number; endSec?: number }[];
}) {
  const hook = input?.hook?.trim() || "Launch-ready in minutes";
  const moments = input?.moments?.length
    ? input.moments
    : [
        { id: "local-m1", title: "Problem setup", startSec: 0, endSec: 4 },
        { id: "local-m2", title: "Product magic", startSec: 4, endSec: 9 },
        { id: "local-m3", title: "Launch kit payoff", startSec: 9, endSec: 14 },
      ];

  return {
    hook,
    cta: "Create your launch kit",
    lines: moments.map((m, i) => ({
      text:
        i === 0
          ? `${hook}. Start with the messy launch work your audience already knows.`
          : i === moments.length - 1
            ? "Then end with a complete kit: video, captions, Product Hunt copy, and a share page."
            : `Now show ${m.title || "the product moment"} as the turning point.`,
      startSec: m.startSec ?? i * 4,
      endSec: m.endSec ?? i * 4 + 3.5,
    })),
    shot_list: moments.map((m, i) => ({
      momentId: m.id,
      durationSec: Math.max(2.5, (m.endSec ?? i * 4 + 3.5) - (m.startSec ?? i * 4)),
      zoomTarget: { x: 0.5, y: 0.48, scale: i === 1 ? 1.18 : 1.05 },
    })),
  };
}

export function localFreeCaptions(input?: {
  productName?: string;
  script?: { hook?: string; cta?: string };
  socialClips?: { id: string; label: string; platform: string }[];
}) {
  const name = input?.productName?.trim() || "LaunchReel";
  const hook = input?.script?.hook || "Launch-ready in minutes";
  const cta = input?.script?.cta || "Create your launch kit";
  return {
    x: `${hook}. ${name} turns product footage into launch videos, PH copy, clips, and a share page. ${cta}.`,
    linkedin: `${name} helps teams turn raw product demos into a complete launch kit: hero video, social clips, launch copy, and a shareable page. ${cta}.`,
    phFirstComment: `Built ${name} for founders who need launch assets without hiring a video team. Happy to hear what you would improve.`,
    socialClips: (input?.socialClips ?? []).map((clip) => ({
      id: clip.id,
      caption: `${clip.label}: ${hook}. ${cta}.`,
    })),
  };
}

export function localFreeJudge() {
  return {
    winner: 1,
    hook: 92,
    clarity: 91,
    pacing: 89,
    artifacts: 90,
    total: 91,
    pass: true,
    notes: ["Variant 1 has the clearest before/after arc.", "The CTA is direct and launch-focused."],
  };
}

export function localFreeRewrite(input?: { text?: string; mode?: string }) {
  const text = input?.text?.trim() || "LaunchReel turns product demos into launch assets.";
  const prefix =
    input?.mode === "less-hype"
      ? "Practically:"
      : input?.mode === "technical"
        ? "Technical angle:"
        : input?.mode === "punchy"
          ? "Sharper:"
          : "Founder voice:";
  return { text: `${prefix} ${text}` };
}

export function localFreeLocalize(input?: { productName?: string; locale?: string; hook?: string; cta?: string }) {
  const locale = input?.locale || "French";
  const name = input?.productName || "LaunchReel";
  return {
    hook: `${input?.hook || "Launch-ready in minutes"} (${locale})`,
    cta: `${input?.cta || "Create your launch kit"} (${locale})`,
    oneLiner: `${name} adapts your launch story for ${locale} markets.`,
    x: `${name}: launch assets, captions, and a share page adapted for ${locale}.`,
  };
}

export function localFreeRecap(input?: { notes?: string; durationSec?: number }) {
  const duration = Math.max(1, Math.round(input?.durationSec ?? 60));
  const mmss = (total: number) => {
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const hasNotes = Boolean(input?.notes?.trim());
  return {
    title: "Product walkthrough: from setup to first result",
    summary: hasNotes
      ? "A quick tour of the core flow, ending on the finished output."
      : "A short product walkthrough covering setup, the main action, and the payoff screen.",
    chapters: [
      { time: "0:00", label: "Intro & setup" },
      { time: mmss(Math.round(duration * 0.35)), label: "Core workflow" },
      { time: mmss(Math.round(duration * 0.75)), label: "The payoff" },
    ],
  };
}

export function localFreeBrandExtract(url?: string) {
  let logoText = "Your Product";
  try {
    if (url?.trim()) {
      const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
        /^www\./,
        "",
      );
      const base = host.split(".")[0] || host;
      logoText = base.charAt(0).toUpperCase() + base.slice(1);
    }
  } catch {
    /* keep default */
  }
  return {
    logoText,
    primaryColor: "#6E56F7",
    accentColor: "#8A78F9",
    backgroundColor: "#0A0A0B",
    font: "Geist",
    voice: "Founder" as const,
  };
}

export function localFreeDirector() {
  return {
    motion: 88,
    brandFidelity: 86,
    clarity: 90,
    artifacts: 92,
    total: 89,
    pass: true,
    notes: [
      "Camera move reads as deliberate and premium.",
      "Palette tracks the brand colors closely.",
    ],
    improvedPrompt: "",
  };
}

export function localFreeAvatar() {
  // The client synthesizes a placeholder talking head locally in local-free mode.
  return { requestId: "local-avatar", status: "done" as const, localFree: true };
}

export function localFreeSeedanceShot() {
  // The client synthesizes a branded placeholder clip locally in local-free
  // mode (no network / no fal.ai key needed). This marker is returned for
  // direct API testing.
  return { requestId: "local-seedance", status: "done" as const, localFree: true };
}

export function localFreeAgentPlan(input?: { goal?: string; avoid?: string[]; stopWhen?: string }) {
  return {
    steps: [
      { goal: "Open the product", action: "Load the supplied URL and wait for the main UI." },
      {
        goal: input?.goal?.trim() || "Show the core workflow",
        action: "Move through the first visible creation or demo step.",
      },
      { goal: "Capture the payoff", action: "End on the clearest completed output or dashboard." },
    ],
    avoid: input?.avoid?.length ? input.avoid : ["Do not enter real credentials", "Do not submit payments"],
    stopWhen: input?.stopWhen?.trim() || "The payoff screen or dashboard is visible.",
  };
}

export function localFreeAgentCapture() {
  return {
    captureMode: "screenshots",
    videoBase64: null,
    clicks: [{ tMs: 700, x: 0.5, y: 0.5 }],
    screenshots: [
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    ],
    partial: false,
    failureReason: null,
    mimeType: "video/webm",
  };
}

export function localFreeWav(text = "LaunchReel local free mode narration."): ArrayBuffer {
  const sampleRate = 16_000;
  const seconds = Math.min(2, Math.max(0.5, text.length / 60));
  const samples = Math.floor(sampleRate * seconds);
  const ab = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(ab);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const amp = Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 0.08;
    view.setInt16(44 + i * 2, amp * 0x7fff, true);
  }
  return ab;
}

export function localFreeRenderJob(projectId = "local-project"): RenderJob {
  const now = new Date().toISOString();
  return {
    id: `local_job_${projectId}`,
    clerkId: LOCAL_FREE_USER_ID,
    projectId,
    status: "done",
    payload: { localFree: true, aspects: ["16:9", "9:16", "1:1"] },
    result: { message: "Local free render completed with browser-generated assets." },
    error: null,
    triggerRunId: "local-free",
    createdAt: now,
    updatedAt: now,
  };
}

export function localFreeCheckoutUrl(req: Request): string {
  return new URL("/dashboard?checkout=local-free", req.url).toString();
}

export function localFreeJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, init);
}
