"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_BRAND_KIT } from "./mock-data";
import type { BrandKit } from "./types";

const STORAGE_KEY = "launchreel.brand-kit.v1";

let snapshot: BrandKit = DEFAULT_BRAND_KIT;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = { ...DEFAULT_BRAND_KIT, ...(JSON.parse(raw) as BrandKit) };
  } catch {
    /* corrupt — keep default */
  }
}

function subscribe(cb: () => void): () => void {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): BrandKit {
  ensureLoaded();
  return snapshot;
}

export function saveBrandKit(kit: BrandKit): void {
  ensureLoaded();
  snapshot = kit;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
  } catch {
    /* storage full */
  }
  notify();
}

export function getBrandKit(): BrandKit {  return getSnapshot();
}

/** True when the kit still matches the defaults (never customized by the user). */
export function isDefaultBrandKit(kit: BrandKit = getSnapshot()): boolean {
  return (
    kit.logoText === DEFAULT_BRAND_KIT.logoText &&
    kit.primaryColor === DEFAULT_BRAND_KIT.primaryColor &&
    kit.accentColor === DEFAULT_BRAND_KIT.accentColor &&
    kit.backgroundColor === DEFAULT_BRAND_KIT.backgroundColor
  );
}

export function useBrandKit(): BrandKit {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_BRAND_KIT);
}

export function useBrandKitActions() {
  const kit = useBrandKit();
  const update = useCallback((patch: Partial<BrandKit>) => {
    saveBrandKit({ ...getSnapshot(), ...patch });
  }, []);
  return { kit, update, reset: () => saveBrandKit(DEFAULT_BRAND_KIT) };
}
