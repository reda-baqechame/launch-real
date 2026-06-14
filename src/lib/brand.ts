"use client";

import { useSyncExternalStore } from "react";
import type { BrandKit } from "./types";
import { DEFAULT_BRAND_KIT } from "./mock-data";

// The brand kit persists in the browser so every future launch comes out
// on-brand — the vision's "switching cost / brand memory" moat.
const STORAGE_KEY = "launchreel.brand_kit.v1";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

let cached: BrandKit | null = null;

function read(): BrandKit {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = raw ? { ...DEFAULT_BRAND_KIT, ...(JSON.parse(raw) as Partial<BrandKit>) } : DEFAULT_BRAND_KIT;
  } catch {
    cached = DEFAULT_BRAND_KIT;
  }
  return cached;
}

export function saveBrandKit(kit: BrandKit) {
  cached = kit;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
  } catch {
    /* storage unavailable — keep in memory */
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive, hydration-safe read of the saved brand kit. */
export function useBrandKit(): BrandKit {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_BRAND_KIT);
}
