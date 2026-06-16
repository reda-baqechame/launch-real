"use client";

import { useEffect, useState } from "react";
import { useAnthropicKey, useTtsKey } from "@/lib/ai";
import { fetchPublicConfig, type PublicConfig } from "@/lib/public-config-client";

export type { PublicConfig };
export { fetchPublicConfig, consumeKitCredit } from "@/lib/public-config-client";

export function usePublicConfig(): PublicConfig | null {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchPublicConfig().then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return cfg;
}

/** True when AI works without a BYO Anthropic key (hosted SaaS). */
export function useAiEnabled(): boolean {
  const key = useAnthropicKey();
  const cfg = usePublicConfig();
  if (cfg?.localFree) return true;
  if (cfg?.hosted) return true;
  return Boolean(key);
}

/** True when TTS/transcribe works without BYO keys. */
export function useTtsEnabled(): boolean {
  const key = useTtsKey();
  const cfg = usePublicConfig();
  if (cfg?.localFree) return true;
  if (cfg?.hosted && cfg.serverTts) return true;
  return Boolean(key);
}
