export interface PublicConfig {
  localFree: boolean;
  hosted: boolean;
  clerk: boolean;
  database: boolean;
  cloudSync: boolean;
  stripe: boolean;
  serverTts: boolean;
  serverTranscribe: boolean;
  localFreeAvailable?: boolean;
}

let cache: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

export async function fetchPublicConfig(): Promise<PublicConfig> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/api/public-config")
      .then((r) => r.json() as Promise<PublicConfig>)
      .then((cfg) => {
        cache = cfg;
        return cfg;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function consumeKitCredit(): Promise<void> {
  const cfg = await fetchPublicConfig();
  if (cfg.localFree || !cfg.hosted) return;

  const res = await fetch("/api/credits/consume", { method: "POST" });
  if (res.status === 402) {
    throw new Error("No kit credits remaining. Upgrade on /pricing.");
  }
  if (res.status === 401) {
    throw new Error("Sign in required to generate a launch kit.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Could not use kit credit.");
  }
}

export async function assertKitCreditAvailable(): Promise<void> {
  const cfg = await fetchPublicConfig();
  if (cfg.localFree || !cfg.hosted) return;

  const res = await fetch("/api/user/credits", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Sign in required to generate a launch kit.");
  }
  if (!res.ok) {
    throw new Error("Could not verify kit credits. Try again before generating.");
  }
  const body = (await res.json()) as { credits?: number | null };
  if ((body.credits ?? 0) <= 0) {
    throw new Error("No kit credits remaining. Upgrade on /pricing.");
  }
}
