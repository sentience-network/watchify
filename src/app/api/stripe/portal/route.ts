import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getStripe, isStripeReady } from "@/lib/stripe";
import { findUserById } from "@/lib/server/users-db";
import { getAppUrl } from "@/lib/site";

export async function POST() {
  if (!isStripeReady()) {
    return NextResponse.json(
      { error: "Stripe is not configured", demo: true },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const user = await findUserById(session.user.id);
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Subscribe first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/settings`,
  });

  return NextResponse.json({ url: portal.url });
}
