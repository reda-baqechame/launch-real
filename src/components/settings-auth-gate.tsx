"use client";

import { SignInButton, useUser } from "@clerk/nextjs";

export function SettingsAuthGate({
  signedOut,
  signedIn,
}: {
  signedOut: React.ReactNode;
  signedIn: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  return isSignedIn ? signedIn : signedOut;
}

export function SettingsSignInButton({ children }: { children: React.ReactNode }) {
  return <SignInButton mode="modal">{children}</SignInButton>;
}
