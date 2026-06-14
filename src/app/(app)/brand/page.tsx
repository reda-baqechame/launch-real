import { Button, Card, Eyebrow, VideoSurface } from "@/components/ui";
import { DEFAULT_BRAND_KIT, LOCALES, VOICE_CHIPS } from "@/lib/mock-data";
import { VoiceChips } from "@/components/voice-chips";

export const metadata = { title: "Brand Kit — LaunchReel" };

export default function BrandPage() {
  const bk = DEFAULT_BRAND_KIT;

  return (
    <div className="mx-auto max-w-4xl">
      <Eyebrow>Brand Kit</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">
        Own a small creative studio.
      </h1>
      <p className="mt-2 text-ink-mute">
        Set this once and every future launch kit comes out on-brand.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="space-y-5 p-6">
          <Field label="Logo / wordmark" defaultValue={bk.logoText} />
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Primary" value={bk.primaryColor} />
            <ColorField label="Accent" value={bk.accentColor} />
            <ColorField label="Background" value={bk.backgroundColor} />
          </div>
          <Field label="Font" defaultValue={bk.font} />
          <div>
            <p className="text-sm font-medium text-ink">Default voice</p>
            <p className="mt-1 mb-2 text-xs text-ink-mute">
              The tone every kit starts from.
            </p>
            <VoiceChips options={VOICE_CHIPS.slice(0, 5)} />
          </div>
          <Field label="Default CTA" defaultValue={bk.cta} />
          <Field label="End card" defaultValue={bk.endCard} />
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
            <Button>Save brand kit</Button>
            <Button variant="secondary">Apply to all future kits</Button>
          </div>
        </Card>

        {/* End-card preview */}
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-sm font-medium text-ink">End card preview</p>
          <VideoSurface label={bk.endCard} ratio="16 / 9" />
          <p className="text-xs text-ink-mute">
            This is how your videos sign off. Watermark: {bk.watermark}.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent/60"
      />
    </label>
  );
}

function ColorField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-base px-3 py-2">
        <span className="size-5 rounded-md border border-line-strong" style={{ background: value }} />
        <span className="font-mono text-xs text-ink-soft">{value}</span>
      </div>
    </label>
  );
}
