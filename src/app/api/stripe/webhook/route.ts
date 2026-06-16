import Stripe from "stripe";
import { NextResponse } from "next/server";
import { isStripeEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { claimStripeEvent } from "@/lib/db/stripe-events";
import { addCredits, ensureAppUser } from "@/lib/db/users";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ received: true, localFree: true });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const claimed = await withDb(async (db) => claimStripeEvent(db!, event.id));
  if (claimed === null) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" && session.status === "complete") {
      const clerkId = session.metadata?.clerkId;
      const credits = Number(session.metadata?.credits ?? 0);
      if (clerkId && credits > 0) {
        await withDb(async (db) => {
          await ensureAppUser(db!, clerkId, session.customer_email);
          await addCredits(db!, clerkId, credits);
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
