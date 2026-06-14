import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-soft shadow-[0_8px_30px_-12px_var(--color-accent)]",
  secondary: "bg-elevated text-ink hover:bg-line-strong border border-line",
  outline: "border border-line-strong text-ink-soft hover:text-ink hover:border-ink-mute",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-2",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface/80 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Eyebrow */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-mute",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- StatusBadge */

const statusStyles: Record<string, string> = {
  Live: "text-good border-good/30 bg-good/10",
  Ready: "text-accent-ink border-accent/30 bg-accent/10",
  "Needs review": "text-warn border-warn/30 bg-warn/10",
  Draft: "text-ink-mute border-line-strong bg-surface-2",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] ?? statusStyles.Draft,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/* --------------------------------------------------------------- ScoreBar */

function scoreColor(value: number): string {
  if (value >= 80) return "var(--color-good)";
  if (value >= 65) return "var(--color-accent)";
  if (value >= 50) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- ScoreRing */

export function ScoreRing({ value, size = 140 }: { value: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(value)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tabular-nums text-ink">{value}</span>
        <span className="text-xs text-ink-mute">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ VideoSurface */

export function VideoSurface({
  label = "Hero launch video",
  ratio = "16 / 9",
  className,
}: {
  label?: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <div className="absolute inset-0 glow-accent opacity-60" />
      <div className="absolute inset-0 grid-faint opacity-[0.35]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-line-strong bg-base/70 text-ink transition-transform group-hover:scale-105">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-sm text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Pill */

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}
