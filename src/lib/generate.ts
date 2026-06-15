import type { AiAudit, LaunchAudit, Project, ProjectStatus } from "./types";
import { anglesFor, momentsFor, kitFor, analyticsFor } from "./mock-data";

export interface NewProjectInput {
  url?: string;
  description?: string;
  audience?: string;
  name?: string;
  prdText?: string;
  /** Marks projects that originated from the in-browser recorder. */
  fromRecording?: boolean;
}

/** Deterministic small hash so the same input always yields the same score. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function titleCase(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

/** Best-effort product name from a URL, else the description, else a default. */
export function deriveName(input: NewProjectInput): string {
  if (input.name?.trim()) return input.name.trim();
  if (input.url?.trim()) {
    try {
      const host = new URL(
        input.url.startsWith("http") ? input.url : `https://${input.url}`,
      ).hostname.replace(/^www\./, "");
      const core = host.split(".")[0];
      if (core) return titleCase(core);
    } catch {
      /* fall through */
    }
  }
  const firstWords = input.description?.trim().split(/\s+/).slice(0, 2).join(" ");
  if (firstWords) return titleCase(firstWords);
  return "Your product";
}

function buildAudit(name: string, score: number): LaunchAudit {
  // Spread the headline score across the breakdown so the ring and bars agree.
  const dims = [
    "Clarity",
    "Pain intensity",
    "Differentiation",
    "Demo strength",
    "Proof",
    "Launch readiness",
    "Visual quality",
    "CTA strength",
  ];
  const breakdown = dims.map((label, i) => ({
    label,
    value: Math.max(42, Math.min(96, score + ((hash(label) + i * 7) % 24) - 12)),
  }));
  return {
    score,
    strongestAngle: "Your software is built. Now make people understand it.",
    weakestPoint:
      "Your current messaging explains the feature, but not the transformation.",
    bestAudience: "Indie hackers preparing for Product Hunt.",
    bestDemoMoment: "00:42 — the raw recording becomes a full launch kit.",
    recommendedHook: "Stop launching invisible software.",
    breakdown,
    criticism: [
      `${name}'s strongest moment is buried too late in the demo.`,
      "Your homepage says what the tool does, but not why someone should care today.",
      "Proof is thin — add one concrete before/after to lift differentiation.",
    ],
  };
}

function statusForScore(score: number): ProjectStatus {
  if (score >= 85) return "Live";
  if (score >= 78) return "Ready";
  return "Needs review";
}

/**
 * Turn raw user input into a fully-populated, personalized Project. When `ai`
 * is supplied (the real Launch Doctor ran), its audit, hook, and one-liner
 * override the deterministic template.
 */
export function buildProject(input: NewProjectInput, ai?: AiAudit): Project {
  const name = deriveName(input);
  const prdBlock = input.prdText?.trim() ? `\n\nPRD / changelog:\n${input.prdText.trim()}` : "";
  const oneLiner =
    ai?.refinedOneLiner?.trim() ||
    (input.description?.trim() ? input.description.trim() + prdBlock : "") ||
    (input.fromRecording
      ? "A product walkthrough recorded with LaunchReel."
      : `${name} — the best way to show software.`);
  const audience = input.audience?.trim() || ai?.bestAudience || "Indie hackers and SaaS founders";

  const seed = hash(name + oneLiner);
  const score = ai ? Math.max(0, Math.min(100, Math.round(ai.score))) : 70 + (seed % 22);
  const id = `${titleCase(name).toLowerCase().slice(0, 18)}-${(seed % 9999)
    .toString(36)
    .padStart(3, "0")}`;

  const audit: LaunchAudit = ai
    ? {
        score,
        strongestAngle: ai.strongestAngle,
        weakestPoint: ai.weakestPoint,
        bestAudience: ai.bestAudience,
        bestDemoMoment: ai.bestDemoMoment,
        recommendedHook: ai.recommendedHook,
        breakdown: ai.breakdown,
        criticism: ai.criticism,
      }
    : buildAudit(name, score);

  return {
    id,
    name,
    url: input.url?.trim() || "https://example.com",
    oneLiner,
    audience,
    score,
    status: statusForScore(score),
    selectedAngleId: "pain",
    mainHook: ai?.mainHook?.trim() || "Your software is built. Now make people understand it.",
    updatedAt: "Just now",
    audit,
    angles: anglesFor(name, oneLiner),
    moments: momentsFor(),
    assets: kitFor(name),
    analytics: analyticsFor(),
    sourceChangelog: input.prdText?.trim() || undefined,
  };
}
