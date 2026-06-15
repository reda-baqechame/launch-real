import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { appBaseUrl, isStripeEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { ensureAppUser, setStripeCustomerId } from "@/lib/db/users";
import { isNextResponse, jsonError, parseJsonBody } from "@/lib/api-helpers";

export const runtime = "nodejs";

const PLAN_CREDITS: Record<string, { priceId: string; credits: number; mode: "payment" | "subscription" }> = {
  "one-launch": {
    priceId: process.env.STRIPE_PRICE_ONE_LAUNCH ?? "",
    credits: 1,
    mode: "payment",
  },
  "founder-pro": {
    priceId: process.env.STRIPE_PRICE_FOUNDER_PRO ?? "",
    credits: 10,
    mode: "subscription",
  },
  studio: {
    priceId: process.env.STRIPE_PRICE_STUDIO ?? "",
    credits: 30,
    mode: "subscription",
  },
};

function stripeClient(): Stripe | null {
  if (!isStripeEnabled()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const stripe = stripeClient();
  if (!stripe) return jsonError("Stripe is not configured.", 503);

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const body = await parseJsonBody<{ plan?: string }>(req);
  if (isNextResponse(body)) return body;

  const plan = PLAN_CREDITS[body.plan ?? ""];
  if (!plan?.priceId) return jsonError("Unknown plan or missing Stripe price id.", 400);

  const email = await getAuthEmail();
  const user = await withDb(async (db) => ensureAppUser(db, userId, email));
  if (!user) return jsonError("Database unavailable.", 503);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { clerkId: userId },
    });
    customerId = customer.id;
    await withDb(async (db) => setStripeCustomerId(db, userId, customerId!));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: plan.mode,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appBaseUrl()}/dashboard?checkout=success`,
    cancel_url: `${appBaseUrl()}/pricing?checkout=cancel`,
    metadata: { clerkId: userId, credits: String(plan.credits), plan: body.plan ?? "" },
  });

  return NextResponse.json({ url: session.url });
}
