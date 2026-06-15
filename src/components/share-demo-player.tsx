"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { getBlobUrl } from "@/lib/footage-store";
import type { InteractiveDemo, InteractiveDemoStep } from "@/lib/types";

function DemoStepView({ step }: { step: InteractiveDemoStep }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    void getBlobUrl(step.imageKey, "screenshot").then((u) => {
      if (u) {
        revoked = u;
        setUrl(u);
      }
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [step.imageKey]);

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-full rounded-lg border border-line" />
  ) : (
    <div className="aspect-video rounded-lg border border-line bg-surface-2" />
  );
}

export function ShareDemoPlayer({
  demo,
  productUrl,
  onCtaClick,
}: {
  demo: InteractiveDemo;
  productUrl: string;
  onCtaClick?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const step = demo.steps[index];
  const isLast = index >= demo.steps.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      onCtaClick?.();
      window.open(productUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setIndex((i) => i + 1);
  }, [isLast, onCtaClick, productUrl]);

  if (!step) return null;

  return (
    <div className="mt-8 w-full rounded-2xl border border-line bg-surface p-4 text-left">
      <p className="text-sm font-medium text-ink">Interactive product tour</p>
      <p className="mt-1 text-xs text-ink-mute">
        Step {index + 1} of {demo.steps.length}
      </p>
      <div className="relative mt-3">
        <DemoStepView step={step} />
        <div
          className="absolute max-w-xs rounded-xl border border-accent/50 bg-base/95 px-4 py-3 text-sm shadow-lg"
          style={{
            left: `${Math.min(step.hotspot.x * 100, 65)}%`,
            top: `${Math.min(step.hotspot.y * 100, 65)}%`,
          }}
        >
          {step.tooltip}
        </div>
      </div>
      <Button className="mt-4" size="sm" onClick={next}>
        {isLast ? demo.cta : "Next step →"}
      </Button>
    </div>
  );
}
