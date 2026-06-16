/** Phase 10 feature flags — all cloud features degrade gracefully when unset. */
import { isLocalFreeEnvEnabled } from "@/lib/local-free";

export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isCloudSyncEnabled(): boolean {
  return isClerkEnabled() && isDatabaseEnabled();
}

export function isStripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function isTriggerEnabled(): boolean {
  return Boolean(process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_API_URL);
}

export function isRemotionLambdaEnabled(): boolean {
  return Boolean(
    process.env.REMOTION_LAMBDA_FUNCTION_NAME &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function isYouTubeOAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isProductHuntOAuthEnabled(): boolean {
  return Boolean(process.env.PRODUCT_HUNT_CLIENT_ID && process.env.PRODUCT_HUNT_CLIENT_SECRET);
}

export function isBlobStorageEnabled(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isLocalFreeRuntimeEnabled(): boolean {
  return !isProduction() && isLocalFreeEnvEnabled();
}

export function isServerAnthropicEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function isServerOpenAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isServerElevenLabsEnabled(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

/** Hosted SaaS: you own API keys; users sign in and pay via Stripe credits. */
export function isHostedSaas(): boolean {
  return isProduction() && isCloudSyncEnabled();
}
