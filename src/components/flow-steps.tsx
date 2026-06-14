import Link from "next/link";
import { cn } from "@/lib/cn";

const STEPS = [
  { key: "audit", label: "Launch Doctor", path: "audit" },
  { key: "angle", label: "Angle", path: "angle" },
  { key: "moments", label: "Moments", path: "moments" },
  { key: "result", label: "Launch kit", path: "result" },
];

export function FlowSteps({
  projectId,
  current,
}: {
  projectId: string;
  current: "audit" | "angle" | "moments" | "result";
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <Link
              href={`/projects/${projectId}/${s.path}`}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors",
                active
                  ? "bg-elevated text-ink"
                  : done
                    ? "text-ink-soft hover:text-ink"
                    : "text-ink-faint pointer-events-none",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  active
                    ? "bg-accent text-white"
                    : done
                      ? "bg-good/20 text-good"
                      : "bg-surface-2 text-ink-faint",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </Link>
            {i < STEPS.length - 1 && <span className="text-ink-faint">/</span>}
          </div>
        );
      })}
    </nav>
  );
}
