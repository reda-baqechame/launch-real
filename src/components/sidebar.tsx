"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { CREDITS } from "@/lib/mock-data";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/record", label: "Record", icon: "M15 10l4.5-2.6v9.2L15 14M3 7h12v10H3z" },
  { href: "/new", label: "New launch kit", icon: "M12 5v14M5 12h14" },
  { href: "/library", label: "Library", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/brand", label: "Brand kit", icon: "M12 3l8 4.5v9L12 21l-8-4.5v-9z" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface/50 px-3 py-5 lg:flex">
      <Link href="/dashboard" className="px-2 pb-6">
        <Logo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
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
        <p className="mt-0.5 text-sm text-ink">{CREDITS.label}</p>
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
