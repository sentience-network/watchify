import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getStripePriceId } from "@/lib/plans";
import { getStripe, isStripeReady, stripeTaxEnabled } from "@/lib/stripe";
import { findUserById, setStripeCustomer } from "@/lib/server/users-db";
import { getAppUrl } from "@/lib/site";
import { rateLimitDurable } from "@/lib/rate-limit";
import type { PlanId } from "@/lib/plans";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`checkout:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  if (!isStripeReady()) {
    return NextResponse.json(
      {
        error: "Stripe is not configured",
        demo: true,
        message:
          "Set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, and STRIPE_PRICE_* to enable checkout.",
      },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { planId?: PlanId };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId;
  if (planId !== "plus" && planId !== "party") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getStripePriceId(planId);
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing price env for ${planId}` },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  const user = await findUserById(session.user.id);
  if (user?.bannedAt) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  let customerId = user?.stripeCustomerId || undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email || undefined,
      name: session.user.name || undefined,
      metadata: { watchifyUserId: session.user.id },
    });
    customerId = customer.id;
    await setStripeCustomer(session.user.id, customerId);
  }

  const appUrl = getAppUrl();
  const taxOn = stripeTaxEnabled();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Server re-fetches session + plan — do not treat query alone as paid
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    client_reference_id: session.user.id,
    metadata: { watchifyUserId: session.user.id, planId },
    subscription_data: {
      metadata: { watchifyUserId: session.user.id, planId },
    },
    ...(taxOn
      ? {
          automatic_tax: { enabled: true },
          customer_update: { address: "auto" as const },
        }
      : {}),
  });

  return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
}
