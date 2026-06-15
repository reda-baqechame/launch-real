"use client";

import { useSyncExternalStore } from "react";
import type {
  AiAudit,
  DemoMoment,
  GeneratedCaptions,
  JudgeScores,
  StoryRole,
  VideoScript,
} from "./types";

const ANTHROPIC_KEY = "launchreel.anthropic_key";
const TTS_KEY = "launchreel.tts_key";
const TTS_PROVIDER_KEY = "launchreel.tts_provider";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getKey(): string | null {
  try {
    return localStorage.getItem(ANTHROPIC_KEY);
  } catch {
    return null;
  }
}

export function setKey(key: string) {
  try {
    localStorage.setItem(ANTHROPIC_KEY, key.trim());
  } catch {
    /* ignore */
  }
  emit();
}

export function clearKey() {
  try {
    localStorage.removeItem(ANTHROPIC_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useAnthropicKey(): string | null {
  return useSyncExternalStore(subscribe, getKey, () => null);
}

export type TtsProvider = "elevenlabs" | "openai";

export function getTtsKey(): string | null {
  try {
    return localStorage.getItem(TTS_KEY);
  } catch {
    return null;
  }
}

export function getTtsProvider(): TtsProvider {
  try {
    return (localStorage.getItem(TTS_PROVIDER_KEY) as TtsProvider) || "elevenlabs";
  } catch {
    return "elevenlabs";
  }
}

export function setTtsKey(key: string, provider: TtsProvider = "elevenlabs") {
  try {
    localStorage.setItem(TTS_KEY, key.trim());
    localStorage.setItem(TTS_PROVIDER_KEY, provider);
  } catch {
    /* ignore */
  }
  emit();
}

export function clearTtsKey() {
  try {
    localStorage.removeItem(TTS_KEY);
    localStorage.removeItem(TTS_PROVIDER_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useTtsKey(): string | null {
  return useSyncExternalStore(subscribe, getTtsKey, () => null);
}

export interface AuditRequest {
  url?: string;
  description?: string;
  audience?: string;
}

export async function fetchAudit(input: AuditRequest): Promise<AiAudit> {
  const key = getKey();
  if (!key) throw new Error("No Anthropic key connected.");
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Audit failed (${res.status}).`);
  }
  return (await res.json()) as AiAudit;
}

export interface AnalyzeRequest {
  contextLine?: string;
  hasAudio?: boolean;
  frames: { tSec: number; dataUrl: string }[];
  transcript?: string;
}

export interface AnalyzeResponse {
  app_summary: string;
  moments: {
    id: string;
    startSec: number;
    endSec: number;
    title: string;
    role: StoryRole;
    why: string;
    wow_score: number;
    keepByDefault: boolean;
  }[];
}

export async function fetchAnalyze(input: AnalyzeRequest): Promise<AnalyzeResponse> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key to analyze footage.");
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Analysis failed (${res.status}).`);
  }
  return (await res.json()) as AnalyzeResponse;
}

export function analyzeToMoments(
  data: AnalyzeResponse,
  frameThumbs: Map<number, string>,
): DemoMoment[] {
  return data.moments.map((m) => ({
    id: m.id,
    timecode: formatTc(m.startSec),
    title: m.title,
    role: m.role,
    why: m.why,
    keepByDefault: m.keepByDefault,
    startSec: m.startSec,
    endSec: m.endSec,
    wowScore: m.wow_score,
    thumbDataUrl: frameThumbs.get(Math.round(m.startSec)),
  }));
}

function formatTc(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface ScriptRequest {
  mode: "marketing" | "explainer" | "tutorial";
  appSummary: string;
  moments: DemoMoment[];
  contextLine: string;
  language: string;
  hook: string;
}

export interface ScriptResponse extends VideoScript {
  shot_list: { momentId: string; durationSec: number; zoomTarget?: { x: number; y: number; scale: number } }[];
}

export async function fetchScript(input: ScriptRequest): Promise<ScriptResponse> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key for script generation.");
  const res = await fetch("/api/script", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Script failed (${res.status}).`);
  }
  return (await res.json()) as ScriptResponse;
}

export async function fetchTts(text: string, language = "en"): Promise<Blob> {
  const key = getTtsKey();
  if (!key) throw new Error("No TTS key connected.");
  const provider = getTtsProvider();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (provider === "openai") headers["x-openai-key"] = key;
  else headers["x-elevenlabs-key"] = key;

  const res = await fetch("/api/tts", {
    method: "POST",
    headers,
    body: JSON.stringify({ text, language, provider }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `TTS failed (${res.status}).`);
  }
  return res.blob();
}

export async function fetchTranscript(blob: Blob): Promise<string> {
  const key = getTtsKey();
  if (!key || getTtsProvider() !== "openai") {
    throw new Error("OpenAI key required for transcription.");
  }
  const fd = new FormData();
  fd.append("file", blob, "recording.webm");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "x-openai-key": key },
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Transcription failed (${res.status}).`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function fetchCaptions(
  script: VideoScript,
  productName: string,
  socialClips?: { id: string; label: string; platform: string }[],
): Promise<GeneratedCaptions> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key for captions.");
  const res = await fetch("/api/captions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify({ script, productName, socialClips }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Captions failed (${res.status}).`);
  }
  return (await res.json()) as GeneratedCaptions;
}

export async function fetchJudge(
  descriptions: { variant: number; summary: string }[],
): Promise<JudgeScores & { winner: number }> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key for quality judge.");
  const res = await fetch("/api/judge", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify({ variants: descriptions }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Judge failed (${res.status}).`);
  }
  return (await res.json()) as JudgeScores & { winner: number };
}

export type RewriteMode = "founder" | "punchy" | "less-hype" | "technical";

export async function fetchRewrite(text: string, mode: RewriteMode): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key to rewrite copy.");
  const res = await fetch("/api/rewrite", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify({ text, mode }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Rewrite failed (${res.status}).`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

export interface LocalizeResult {
  hook: string;
  cta: string;
  oneLiner: string;
  x: string;
}

export async function fetchLocalize(input: {
  productName: string;
  oneLiner: string;
  hook: string;
  cta: string;
  locale: string;
  style: string;
}): Promise<LocalizeResult> {
  const key = getKey();
  if (!key) throw new Error("Connect an Anthropic key to localize.");
  const res = await fetch("/api/localize", {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Localize failed (${res.status}).`);
  }
  return (await res.json()) as LocalizeResult;
}
