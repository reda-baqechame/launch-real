"use client";

import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui";
import { usePublicConfig } from "@/lib/hosted-config";

function HostedAiBannerSignedIn() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded || isSignedIn) return null;

  return (
    <SignInButton mode="modal">
      <Button size="sm" className="mt-3">Sign in to continue</Button>
    </SignInButton>
  );
}

export function HostedAiBanner() {
  const cfg = usePublicConfig();
  if (!cfg?.hosted && !cfg?.localFree) return null;

  if (cfg.localFree) {
    return (
      <div className="mt-6 rounded-xl border border-good/30 bg-good/5 p-4">
        <p className="text-sm font-medium text-ink">Local free test mode</p>
        <p className="mt-1 text-xs text-ink-mute">
          All AI, voice, credits, checkout, render, and publish APIs use deterministic local test providers.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <p className="text-sm font-medium text-ink">LaunchReel AI included</p>
      <p className="mt-1 text-xs text-ink-mute">
        Claude, TTS, and transcription run on our servers. Sign in and use kit credits from{" "}
        <Link href="/pricing" className="text-accent-ink hover:text-accent-soft">/pricing</Link>.
      </p>
      {cfg.clerk ? <HostedAiBannerSignedIn /> : null}
    </div>
  );
}
