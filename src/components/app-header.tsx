"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { ButtonLink } from "@/components/ui";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkAuthSlot() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="modal">
      <button
        type="button"
        className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
      >
        Sign in
      </button>
    </SignInButton>
  );
}

export function AppHeaderActions() {
  return (
    <div className="flex items-center gap-3">
      <ButtonLink href="/new" size="sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        New launch kit
      </ButtonLink>
      {clerkEnabled ? (
        <ClerkAuthSlot />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-medium text-ink-soft">
          LR
        </span>
      )}
    </div>
  );
}
