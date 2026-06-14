"use client";

import { useSyncExternalStore } from "react";
import type { AiAudit } from "./types";

// The user's Anthropic key lives only in their browser (localStorage). It is
// sent to our own /api/audit route per-request and never persisted server-side.
const STORAGE_KEY = "launchreel.anthropic_key";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function getKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function clearKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive read of the connected key (null when none). Hydration-safe. */
export function useAnthropicKey(): string | null {
  return useSyncExternalStore(subscribe, getKey, () => null);
}

export interface AuditRequest {
  url?: string;
  description?: string;
  audience?: string;
}

/** Calls the server route, which runs the real Launch Doctor with Claude. */
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
