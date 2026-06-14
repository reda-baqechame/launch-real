import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-base/80 px-4 backdrop-blur lg:px-8">
          <Link href="/dashboard" className="lg:hidden">
            <Logo />
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <ButtonLink href="/new" size="sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New launch kit
            </ButtonLink>
            <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-medium text-ink-soft">
              R
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
