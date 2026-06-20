"use client";

import { useState } from "react";
import { Button, Card, VideoSurface } from "@/components/ui";
import { LOCALES, VOICE_CHIPS } from "@/lib/mock-data";
import { useBrandKitActions } from "@/lib/brand-kit-store";
import { VoiceChips } from "@/components/voice-chips";
import { fetchBrandExtract } from "@/lib/ai";
import type { BrandKit } from "@/lib/types";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Keep only valid fields so a bad model response can't corrupt the kit. */
function sanitizeBrandPatch(patch: Partial<BrandKit>): Partial<BrandKit> {
  const out: Partial<BrandKit> = {};
  if (patch.logoText?.trim()) out.logoText = patch.logoText.trim().slice(0, 40);
  if (patch.font?.trim()) out.font = patch.font.trim().slice(0, 40);
  if (patch.voice) out.voice = patch.voice;
  for (const k of ["primaryColor", "accentColor", "backgroundColor"] as const) {
    const v = patch[k];
    if (typeof v === "string" && HEX.test(v.trim())) out[k] = v.trim();
  }
  return out;
}

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
        <AutoFillFromUrl onApply={(patch) => update(patch)} />
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

function AutoFillFromUrl({ onApply }: { onApply: (patch: Partial<BrandKit>) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const patch = sanitizeBrandPatch(await fetchBrandExtract(url));
      if (!Object.keys(patch).length) throw new Error("Couldn't read a brand from that site.");
      onApply(patch);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brand extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-sm font-medium text-ink">Auto-fill from your site</p>
      <p className="mt-1 text-xs text-ink-mute">
        Paste your product URL — LaunchReel reads your colors, font, and name so every shot is on-brand.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourapp.com"
          className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
        <Button size="md" disabled={busy || !url.trim()} onClick={() => void run()}>
          {busy ? "Reading…" : "Auto-fill"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-warn">{error}</p>}
      {done && <p className="mt-2 text-xs text-good">Brand applied — review and save.</p>}
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
