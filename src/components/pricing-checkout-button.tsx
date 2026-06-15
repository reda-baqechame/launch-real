"use client";

import { useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ButtonLink, Button } from "@/components/ui";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function PaidCheckoutButton({
  plan,
  label,
  highlight,
}: {
  plan: string;
  label: string;
  highlight?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  async function checkout() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) {
    return (
      <Button variant={highlight ? "primary" : "secondary"} className="mt-6 w-full" disabled>
        {label}
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant={highlight ? "primary" : "secondary"} className="mt-6 w-full">
          Sign in to purchase
        </Button>
      </SignInButton>
    );
  }

  return (
    <Button
      variant={highlight ? "primary" : "secondary"}
      className="mt-6 w-full"
      disabled={busy}
      onClick={() => void checkout()}
    >
      {busy ? "Redirecting…" : label}
    </Button>
  );
}

export function PricingCheckoutButton({
  plan,
  label,
  highlight,
}: {
  plan: string;
  label: string;
  highlight?: boolean;
}) {
  if (plan === "free" || !clerkEnabled) {
    return (
      <ButtonLink href="/new" variant={highlight ? "primary" : "secondary"} className="mt-6 w-full">
        {label}
      </ButtonLink>
    );
  }

  return <PaidCheckoutButton plan={plan} label={label} highlight={highlight} />;
}
