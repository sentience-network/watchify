import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { updateUserPlan } from "@/lib/server/users-db";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

async function applySubscription(
  userId: string,
  subscription: Stripe.Subscription,
  fallbackPlan?: PlanId
) {
  const priceId = subscription.items.data[0]?.price?.id || "";
  const plan =
    subscription.status === "active" || subscription.status === "trialing"
      ? planFromPriceId(priceId) || fallbackPlan || "plus"
      : "free";
  await updateUserPlan(userId, plan, {
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    subscriptionId:
      subscription.status === "canceled" || subscription.status === "unpaid"
        ? null
        : subscription.id,
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured", demo: true },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        session.client_reference_id ||
        session.metadata?.watchifyUserId ||
        "";
      const planId = (session.metadata?.planId as PlanId) || "plus";
      if (userId && session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        await applySubscription(userId, subscription, planId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      let userId: string | undefined = subscription.metadata?.watchifyUserId;
      if (!userId) {
        // Fallback: look up by Stripe customer id stored on User
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const { prisma } = await import("@/lib/db");
        const row = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        userId = row?.id;
      }
      if (userId) {
        await applySubscription(userId, subscription);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
