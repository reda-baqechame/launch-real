"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { CREDITS } from "@/lib/mock-data";
import { useCredits } from "@/lib/use-credits";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/record", label: "Record", icon: "M15 10l4.5-2.6v9.2L15 14M3 7h12v10H3z" },
  { href: "/new", label: "New launch kit", icon: "M12 5v14M5 12h14" },
  { href: "/library", label: "Library", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/brand", label: "Brand kit", icon: "M12 3l8 4.5v9L12 21l-8-4.5v-9z" },
  { href: "/settings", label: "Settings", icon: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

export function Sidebar() {
  const pathname = usePathname();
  const credits = useCredits();
  const creditLabel = credits.enabled ? credits.label : CREDITS.label;
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface/50 px-3 py-5 lg:flex" aria-label="Sidebar">
      <Link href="/dashboard" className="px-2 pb-6">
        <Logo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1" aria-label="App">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-elevated text-ink"
                  : "text-ink-mute hover:bg-surface-2 hover:text-ink-soft",
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <p className="text-xs text-ink-mute">Credits</p>
        <p className="mt-0.5 text-sm text-ink">{creditLabel}</p>
        <Link
          href="/pricing"
          className="mt-2 inline-block text-xs font-medium text-accent-ink hover:text-accent-soft"
        >
          Upgrade →
        </Link>
      </div>
    </aside>
  );
}
