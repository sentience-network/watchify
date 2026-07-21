import { NextResponse } from "next/server";
import {
  authConfigured,
  facebookAuthConfigured,
  githubAuthConfigured,
  googleAuthConfigured,
} from "@/lib/auth";
import { isStripeReady, stripeTaxEnabled } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import { realtimePublicUrl } from "@/lib/realtime-token";
import { getEmailTransport } from "@/lib/email";
import {
  devBillingGrantsEnabled,
  openRelayTurnEnabled,
  showDemoLogin,
} from "@/lib/features";
import { traktConfigured } from "@/lib/server/trakt";
import { tmdbConfigured } from "@/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function turnEnvConfigured(): boolean {
  const metered =
    Boolean(process.env.METERED_DOMAIN?.trim()) &&
    Boolean(process.env.METERED_TURN_API_KEY?.trim());
  const staticTurn =
    Boolean(process.env.TURN_URL?.trim()) &&
    Boolean(process.env.TURN_USER?.trim()) &&
    Boolean(process.env.TURN_PASS?.trim());
  return metered || staticTurn || openRelayTurnEnabled();
}

/** Public config for the client — never includes secrets. */
export async function GET() {
  return NextResponse.json({
    stripeReady: isStripeReady(),
    stripeTaxEnabled: stripeTaxEnabled(),
    authConfigured,
    googleAuthConfigured,
    githubAuthConfigured,
    facebookAuthConfigured,
    emailTransport: getEmailTransport(),
    realtimeUrl: realtimePublicUrl(),
    traktConfigured: traktConfigured(),
    tmdbConfigured: tmdbConfigured(),
    liveCatalog: tmdbConfigured(),
    posthogConfigured: Boolean(
      process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST
    ),
    /** Env present for Metered/static/Open Relay — not a live credential fetch. */
    turnEnvConfigured: turnEnvConfigured(),
    plans: PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      blurb: p.blurb,
      features: p.features,
      highlighted: p.highlighted,
      limits: p.limits,
    })),
    demoCheckout: !isStripeReady(),
    devBilling: devBillingGrantsEnabled(),
    showDemoLogin: showDemoLogin(),
  });
}
