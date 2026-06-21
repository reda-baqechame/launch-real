"use client";

import { useSyncExternalStore } from "react";
import type {
  AiAudit,
  BrandKit,
  DemoMoment,
  DirectorScore,
  GeneratedCaptions,
  JudgeScores,
  Slide,
  StoryRole,
  VideoScript,
} from "./types";
import { fetchPublicConfig } from "./public-config-client";

const ANTHROPIC_KEY = "launchreel.anthropic_key";
const TTS_KEY = "launchreel.tts_key";
const TTS_PROVIDER_KEY = "launchreel.tts_provider";
const FAL_KEY = "launchreel.fal_key";

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

export function getFalKey(): string | null {
  try {
    return localStorage.getItem(FAL_KEY);
  } catch {
    return null;
  }
}

export function setFalKey(key: string) {
  try {
    localStorage.setItem(FAL_KEY, key.trim());
  } catch {
    /* ignore */
  }
  emit();
}

export function clearFalKey() {
  try {
    localStorage.removeItem(FAL_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useFalKey(): string | null {
  return useSyncExternalStore(subscribe, getFalKey, () => null);
}

async function aiJsonHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const cfg = await fetchPublicConfig();
  if (!cfg.hosted && !cfg.localFree) {
    const key = getKey();
    if (!key) throw new Error("No Anthropic key connected.");
    headers["x-anthropic-key"] = key;
  }
  return headers;
}

async function assertAiReady(): Promise<void> {
  const cfg = await fetchPublicConfig();
  if (cfg.localFree) return;
  if (cfg.hosted) return;
  if (!getKey()) throw new Error("No Anthropic key connected.");
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) {
    throw new Error(body.error || "Sign in required.");
  }
  if (res.status === 402) {
    throw new Error(body.error || "No kit credits remaining. Upgrade on /pricing.");
  }
  throw new Error(body.error || `${fallback} (${res.status}).`);
}

export interface AuditRequest {
  url?: string;
  description?: string;
  audience?: string;
}

export async function fetchAudit(input: AuditRequest): Promise<AiAudit> {
  await assertAiReady();
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Audit failed");
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
  await assertAiReady();
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Analysis failed");
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
  await assertAiReady();
  const res = await fetch("/api/script", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Script failed");
  return (await res.json()) as ScriptResponse;
}

async function ttsHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const cfg = await fetchPublicConfig();
  if ((cfg.localFree || cfg.hosted) && cfg.serverTts) return headers;

  const key = getTtsKey();
  if (!key) throw new Error("No TTS key connected.");
  const provider = getTtsProvider();
  if (provider === "openai") headers["x-openai-key"] = key;
  else headers["x-elevenlabs-key"] = key;
  return headers;
}

export async function fetchTts(text: string, language = "en"): Promise<Blob> {
  const cfg = await fetchPublicConfig();
  const provider = (cfg.localFree || cfg.hosted) && cfg.serverTts ? "openai" : getTtsProvider();
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: await ttsHeaders(),
    body: JSON.stringify({ text, language, provider }),
  });
  if (!res.ok) await parseApiError(res, "TTS failed");
  return res.blob();
}

export async function fetchTranscript(blob: Blob): Promise<string> {
  const cfg = await fetchPublicConfig();
  const headers: Record<string, string> = {};
  if ((!cfg.localFree && !cfg.hosted) || !cfg.serverTranscribe) {
    const key = getTtsKey();
    if (!key || getTtsProvider() !== "openai") {
      throw new Error("OpenAI key required for transcription.");
    }
    headers["x-openai-key"] = key;
  }

  const fd = new FormData();
  fd.append("file", blob, "recording.webm");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) await parseApiError(res, "Transcription failed");
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function fetchCaptions(
  script: VideoScript,
  productName: string,
  socialClips?: { id: string; label: string; platform: string }[],
): Promise<GeneratedCaptions> {
  await assertAiReady();
  const res = await fetch("/api/captions", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify({ script, productName, socialClips }),
  });
  if (!res.ok) await parseApiError(res, "Captions failed");
  return (await res.json()) as GeneratedCaptions;
}

export async function fetchJudge(
  descriptions: { variant: number; summary: string }[],
): Promise<JudgeScores & { winner: number }> {
  await assertAiReady();
  const res = await fetch("/api/judge", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify({ variants: descriptions }),
  });
  if (!res.ok) await parseApiError(res, "Judge failed");
  return (await res.json()) as JudgeScores & { winner: number };
}

export type RewriteMode = "founder" | "punchy" | "less-hype" | "technical";

export async function fetchRewrite(text: string, mode: RewriteMode): Promise<string> {
  await assertAiReady();
  const res = await fetch("/api/rewrite", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify({ text, mode }),
  });
  if (!res.ok) await parseApiError(res, "Rewrite failed");
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
  await assertAiReady();
  const res = await fetch("/api/localize", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Localize failed");
  return (await res.json()) as LocalizeResult;
}

export interface RecapResult {
  title: string;
  summary: string;
  chapters: { time: string; label: string }[];
}

export async function fetchRecap(input: { notes: string; durationSec: number }): Promise<RecapResult> {
  await assertAiReady();
  const res = await fetch("/api/recap", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Recap failed");
  return (await res.json()) as RecapResult;
}

export async function fetchDirectorCritique(input: {
  frames: { tSec: number; dataUrl: string }[];
  label: string;
  placement: string;
  hook?: string;
  aspect?: string;
  brandColors?: { primary?: string; accent?: string; bg?: string };
}): Promise<DirectorScore> {
  await assertAiReady();
  const res = await fetch("/api/director", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Director critique failed");
  return (await res.json()) as DirectorScore;
}

export async function fetchTranslate(input: {
  hook: string;
  cta: string;
  lines: string[];
  language: string;
}): Promise<{ hook: string; cta: string; lines: string[] }> {
  await assertAiReady();
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Translate failed");
  return (await res.json()) as { hook: string; cta: string; lines: string[] };
}

export async function fetchDeck(input: {
  productName: string;
  oneLiner?: string;
  hook?: string;
  cta?: string;
  audience?: string;
  moments?: string[];
  weakestPoint?: string;
}): Promise<{ slides: Slide[] }> {
  await assertAiReady();
  const res = await fetch("/api/deck", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Deck failed");
  return (await res.json()) as { slides: Slide[] };
}

export async function fetchBrandExtract(url: string): Promise<Partial<BrandKit>> {
  await assertAiReady();
  const res = await fetch("/api/brand-extract", {
    method: "POST",
    headers: await aiJsonHeaders(),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) await parseApiError(res, "Brand extraction failed");
  return (await res.json()) as Partial<BrandKit>;
}

export type SeedanceMode = "text-to-video" | "image-to-video";

async function seedanceHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const cfg = await fetchPublicConfig();
  if (cfg.localFree || cfg.hosted) return headers;
  const key = getFalKey();
  if (!key) throw new Error("No fal.ai key connected. Add it in Settings.");
  headers["x-fal-key"] = key;
  return headers;
}

export interface SeedanceSubmitRequest {
  mode: SeedanceMode;
  prompt: string;
  aspect: "16:9" | "9:16" | "1:1";
  durationSec: number;
  resolution?: "720p" | "1080p";
  imageUrl?: string;
  camera?: string;
}

export async function submitSeedance(
  input: SeedanceSubmitRequest,
): Promise<{ requestId: string; mode: SeedanceMode; status: string; localFree?: boolean }> {
  const res = await fetch("/api/seedance", {
    method: "POST",
    headers: await seedanceHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseApiError(res, "Cinematic shot failed");
  return (await res.json()) as {
    requestId: string;
    mode: SeedanceMode;
    status: string;
    localFree?: boolean;
  };
}

export interface SeedancePollResult {
  status: "queued" | "processing" | "done" | "failed";
  videoUrl?: string;
  error?: string;
  localFree?: boolean;
}

export async function pollSeedance(
  requestId: string,
  mode: SeedanceMode,
): Promise<SeedancePollResult> {
  const headers = await seedanceHeaders();
  const res = await fetch(
    `/api/seedance?requestId=${encodeURIComponent(requestId)}&mode=${encodeURIComponent(mode)}`,
    { headers },
  );
  if (!res.ok) await parseApiError(res, "Cinematic status failed");
  return (await res.json()) as SeedancePollResult;
}

/** Headers for agent API calls (hosted mode uses server keys + Clerk session). */
export async function agentJsonHeaders(): Promise<Record<string, string>> {
  return aiJsonHeaders();
}
