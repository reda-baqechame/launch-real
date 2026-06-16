import Link from "next/link";
import { ButtonLink, Eyebrow, Pill, VideoSurface } from "@/components/ui";
import { Logo } from "@/components/logo";

const PAINS = [
  "The homepage is unclear.",
  "The demo is boring.",
  "The screenshots don't show the value.",
  "The launch post sounds generic.",
  "The Product Hunt gallery is weak.",
  "The buyer doesn't get the use case fast enough.",
];

const STEPS = [
  { n: "01", t: "Paste your product", d: "URL, screen recording, screenshots, PRD, or a guided browser session." },
  { n: "02", t: "Get your Launch Doctor score", d: "An honest audit: strongest angle, weakest point, best demo moment." },
  { n: "03", t: "Approve the moments", d: "We find the moments that make a stranger understand the product." },
  { n: "04", t: "Download the full kit", d: "Video, Product Hunt gallery, social clips, copy, share page, analytics." },
];

const OUTPUTS = [
  "Hero video", "Product Hunt poster", "PH gallery", "Social clips", "5-second GIF",
  "X post", "LinkedIn post", "PH first comment", "Launch email", "Share page",
  "Landing page copy", "Analytics",
];

const REPLACES = ["Loom", "Screen Studio", "Clueso", "Trupeer", "Guidde", "Supademo", "ngram", "Revid"];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-base/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-ink-mute md:flex" aria-label="Primary">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#outputs" className="hover:text-ink">What you get</a>
            <a href="#replaces" className="hover:text-ink">Why it wins</a>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink href="/dashboard" variant="ghost" size="sm">Log in</ButtonLink>
            <ButtonLink href="/new" size="sm">Score my launch</ButtonLink>
          </div>
        </div>
      </header>

      <main id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] glow-accent" />
        <div className="relative mx-auto max-w-3xl px-6 pb-10 pt-20 text-center">
          <Eyebrow>The Product Video OS for software</Eyebrow>
          <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Your software is built.<br />
            Now make people understand it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-ink-soft">
            LaunchReel turns your app into a complete launch kit: video, Product
            Hunt gallery, social clips, launch copy, and a share page —
            automatically.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/new" size="lg">Score my launch</ButtonLink>
            <ButtonLink href="/share/launchreel" variant="secondary" size="lg">Watch demo</ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-20">
          <VideoSurface label="The LaunchReel hero video" />
          <p className="mt-3 text-center text-sm text-ink-mute">
            Made entirely with LaunchReel from one screen recording.
          </p>
        </div>
      </section>

      {/* Pain */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="max-w-2xl">
            <Eyebrow>The real problem</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold text-ink">
              Software is easier to build than ever. Distribution is not.
            </h2>
            <p className="mt-3 text-ink-soft">
              Most software doesn&apos;t fail because it can&apos;t be built. It
              fails because it&apos;s invisible. The enemy isn&apos;t bad video —
              it&apos;s software no one understands.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p} className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-soft">
                <span className="text-bad">✕</span> {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-20">
        <Eyebrow>The transformation</Eyebrow>
        <h2 className="mt-4 text-3xl font-semibold text-ink">
          From a URL to a launch kit in four steps.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-line bg-surface p-5">
              <span className="font-mono text-sm text-accent-ink">{s.n}</span>
              <h3 className="mt-3 font-medium text-ink">{s.t}</h3>
              <p className="mt-1.5 text-sm text-ink-mute">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Outputs grid */}
      <section id="outputs" className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Eyebrow>One product → a whole launch package</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold text-ink">
            Not one MP4. An agency deliverable.
          </h2>
          <div className="mt-10 flex flex-wrap gap-2.5">
            {OUTPUTS.map((o) => (
              <Pill key={o} className="px-4 py-2 text-sm">{o}</Pill>
            ))}
          </div>
        </div>
      </section>

      {/* Replaces */}
      <section id="replaces" className="mx-auto max-w-5xl px-6 py-20">
        <Eyebrow>Why it wins</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-ink">
          Loom records your screen. LaunchReel turns your product into a
          professional presentation.
        </h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Record, generate, edit, present, share, localize, and track any
          software product video from one place. It replaces:
        </p>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {REPLACES.map((r) => (
            <span key={r} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink-soft">
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="pointer-events-none absolute inset-0 glow-accent opacity-70" />
        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-ink">
            Stop launching invisible products.
          </h2>
          <p className="mt-4 text-ink-soft">
            Can a stranger understand your product and care within 5 seconds?
            LaunchReel makes sure they can.
          </p>
          <div className="mt-8">
            <ButtonLink href="/new" size="lg">Score my launch free</ButtonLink>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <Logo />
          <p className="text-sm text-ink-mute">The best way to show software.</p>
          <div className="flex gap-5 text-sm text-ink-mute">
            <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link href="/new" className="hover:text-ink">New kit</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
