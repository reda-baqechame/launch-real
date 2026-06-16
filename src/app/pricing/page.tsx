import Link from "next/link";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { Logo } from "@/components/logo";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";

export const metadata = { title: "Pricing — LaunchReel" };

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    cta: "Score my launch",
    highlight: false,
    plan: "free",
    features: ["1 Launch Doctor audit", "1 watermarked mini kit", "Share page with LaunchReel branding"],
  },
  {
    name: "One Launch",
    price: "$49",
    cadence: "one-time",
    cta: "Get the full kit",
    highlight: false,
    plan: "one-launch",
    features: ["Full launch kit", "Watermark removed", "Download-all ZIP", "Product Hunt kit", "Social clips + launch copy"],
  },
  {
    name: "Founder Pro",
    price: "$99",
    cadence: "/month",
    cta: "Start Founder Pro",
    highlight: true,
    plan: "founder-pro",
    features: ["Multiple launch kits", "Brand kit", "Analytics", "Localized versions", "Changelog → launch assets", "Regenerations"],
  },
  {
    name: "Studio",
    price: "$299",
    cadence: "/month",
    cta: "Start Studio",
    highlight: false,
    plan: "studio",
    features: ["More kits", "Priority rendering", "Team workspace", "Advanced analytics", "Multiple products"],
  },
];

export default function PricingPage() {
  return (
    <div>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/"><Logo /></Link>
          <ButtonLink href="/new" size="sm">Score my launch</ButtonLink>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
            Priced like it replaces creative labor.
          </h1>
          <p className="mt-3 text-ink-soft">Not like a cheap AI toy. Plus a $799+ Agency plan with white-label share pages.</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={
                p.highlight
                  ? "relative border-accent/50 p-6 ring-1 ring-accent/30"
                  : "p-6"
              }
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <p className="text-sm text-ink-mute">{p.name}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-ink">{p.price}</span>
                <span className="text-sm text-ink-mute">{p.cadence}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-good">✓</span> {f}
                  </li>
                ))}
              </ul>
              <PricingCheckoutButton
                plan={p.plan}
                label={p.cta}
                highlight={p.highlight}
              />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
