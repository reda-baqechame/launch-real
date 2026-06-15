"use client";

import { useEffect, useState } from "react";
import { CREDITS } from "@/lib/mock-data";

interface CreditsState {
  label: string;
  credits: number | null;
  enabled: boolean;
}

export function useCredits(): CreditsState {
  const [state, setState] = useState<CreditsState>({
    label: CREDITS.label,
    credits: null,
    enabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/user/credits")
      .then((r) => r.json())
      .then((data: { label?: string; credits?: number | null; enabled?: boolean }) => {
        if (cancelled) return;
        setState({
          label: data.label ?? CREDITS.label,
          credits: data.credits ?? null,
          enabled: Boolean(data.enabled),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
