"use client";

import { useState } from "react";
import { Button, Card, VideoSurface } from "@/components/ui";
import { LOCALES, VOICE_CHIPS } from "@/lib/mock-data";
import { useBrandKitActions } from "@/lib/brand-kit-store";
import { VoiceChips } from "@/components/voice-chips";

export function BrandKitEditor() {
  const { kit, update, reset } = useBrandKitActions();
  const [saved, setSaved] = useState(false);

  function save() {
    update(kit);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="space-y-5 p-6">
        <Field
          label="Logo / wordmark"
          value={kit.logoText}
          onChange={(logoText) => update({ logoText })}
        />
        <div className="grid grid-cols-3 gap-3">
          <ColorField
            label="Primary"
            value={kit.primaryColor}
            onChange={(primaryColor) => update({ primaryColor })}
          />
          <ColorField
            label="Accent"
            value={kit.accentColor}
            onChange={(accentColor) => update({ accentColor })}
          />
          <ColorField
            label="Background"
            value={kit.backgroundColor}
            onChange={(backgroundColor) => update({ backgroundColor })}
          />
        </div>
        <Field label="Font" value={kit.font} onChange={(font) => update({ font })} />
        <Field label="Default CTA" value={kit.cta} onChange={(cta) => update({ cta })} />
        <Field label="End card" value={kit.endCard} onChange={(endCard) => update({ endCard })} />
        <div>
          <p className="text-sm font-medium text-ink">Default voice</p>
          <p className="mt-1 mb-2 text-xs text-ink-mute">The tone every kit starts from.</p>
          <VoiceChips options={VOICE_CHIPS.slice(0, 5)} />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Localized languages</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <span
                key={l.code}
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-soft"
              >
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save}>{saved ? "Saved ✓" : "Save brand kit"}</Button>
          <Button variant="secondary" onClick={reset}>
            Reset to default
          </Button>
        </div>
        <p className="text-xs text-ink-mute">
          Stored in this browser. Applied to new video renders automatically.
        </p>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <p className="text-sm font-medium text-ink">End card preview</p>
        <VideoSurface label={kit.endCard} ratio="16 / 9" />
        <p className="text-xs text-ink-mute">
          Watermark: {kit.watermark}. Colors: {kit.primaryColor} / {kit.accentColor}
        </p>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent/60"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-mute">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-lg border border-line bg-base"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-base px-2 py-1.5 font-mono text-xs"
        />
      </div>
    </label>
  );
}
