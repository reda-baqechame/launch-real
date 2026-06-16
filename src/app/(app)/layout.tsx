import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Logo } from "@/components/logo";
import { AppHeaderActions } from "@/components/app-header";

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
          <AppHeaderActions />
        </header>
        <main id="main-content" className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
