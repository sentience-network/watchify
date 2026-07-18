import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { getStripe, isStripeReady, planFromPriceId } from "@/lib/stripe";
import { findUserById, updateUserPlan } from "@/lib/server/users-db";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Re-fetch a Checkout Session from Stripe and sync User.plan in Prisma.
 * Source of truth is Stripe + DB — not the success query string alone.
 */
export async function GET(req: Request) {
  if (!isStripeReady()) {
    return NextResponse.json(
      { error: "Stripe not configured", demo: true },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch {
    return NextResponse.json({ error: "Unknown checkout session" }, { status: 404 });
  }

  const ownerId =
    checkout.client_reference_id ||
    checkout.metadata?.watchifyUserId ||
    "";
  if (ownerId !== session.user.id) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
  }

  const planId = (checkout.metadata?.planId as PlanId) || "plus";
  let appliedPlan: PlanId = planId;

  if (
    checkout.status === "complete" &&
    checkout.payment_status === "paid" &&
    checkout.subscription
  ) {
    const sub =
      typeof checkout.subscription === "string"
        ? await stripe.subscriptions.retrieve(checkout.subscription)
        : checkout.subscription;
    const priceId = sub.items.data[0]?.price?.id || "";
    appliedPlan =
      sub.status === "active" || sub.status === "trialing"
        ? planFromPriceId(priceId) || planId
        : "free";
    await updateUserPlan(session.user.id, appliedPlan, {
      customerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscriptionId:
        sub.status === "canceled" || sub.status === "unpaid" ? null : sub.id,
    });
  }

  const user = await findUserById(session.user.id);
  return NextResponse.json({
    ok: true,
    checkoutStatus: checkout.status,
    paymentStatus: checkout.payment_status,
    plan: user?.plan ?? appliedPlan,
    stripeCustomerId: user?.stripeCustomerId ?? null,
    stripeSubscriptionId: user?.stripeSubscriptionId ?? null,
  });
}
