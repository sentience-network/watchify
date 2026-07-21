"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PartyTrialStatus } from "@/components/PartyTrialStatus";
import { PLANS, type PlanId } from "@/lib/plans";
import { useWatchify } from "@/lib/store";
import { formatPartyTrialLabel } from "@/lib/party-trial";

type Config = {
  stripeReady: boolean;
  demoCheckout: boolean;
  devBilling: boolean;
};

export default function PricingPage() {
  const { data: session } = useSession();
  const { state, setPlanLocal } = useWatchify();
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) =>
        setConfig({
          stripeReady: d.stripeReady,
          demoCheckout: d.demoCheckout,
          devBilling: Boolean(d.devBilling),
        })
      )
      .catch(() =>
        setConfig({ stripeReady: false, demoCheckout: true, devBilling: true })
      );
  }, []);

  async function checkout(planId: PlanId) {
    if (planId === "free") {
      await setPlanLocal("free", { subscriptionId: null });
      setMessage("Switched to Free (saved to your account).");
      return;
    }
    setBusy(planId);
    setMessage("");
    if (!session?.user) {
      setBusy(null);
      setMessage("Sign in to subscribe.");
      return;
    }
    if (!config?.stripeReady) {
      if (!config?.devBilling) {
        setBusy(null);
        setMessage(
          "Stripe is required for paid plans. Add STRIPE_* keys, or set WATCHIFY_DEV_BILLING=true for local grants."
        );
        return;
      }
      await setPlanLocal(planId);
      setBusy(null);
      setMessage(
        `Local billing grant: activated ${planId} on your account (no card charged). Configure Stripe for real Checkout.`
      );
      return;
    }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.message || data.error || "Checkout failed");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Pricing
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Host the night. Grow the graph.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist/80">
            New accounts get <strong className="text-white">30 days of Party free</strong>.
            Free forever for joining friends — plus one free hosted party after
            trial. Party unlocks unlimited live rooms. Cancel anytime via Stripe
            when configured.
          </p>
          <div className="mt-3">
            <PartyTrialStatus
              plan={state.plan}
              partyTrialEndsAt={state.partyTrialEndsAt}
              freeHostsRemaining={state.freeHostsRemaining}
              stripeSubscriptionId={state.stripeSubscriptionId}
            />
          </div>
        </header>

        {config?.demoCheckout && (
          <div className="mb-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-soft">
            {config.devBilling ? (
              <>
                Stripe Checkout is not configured. Local <strong>billing grants</strong>{" "}
                still save the plan to your account (no charge). Set Stripe env vars for live
                payments.
              </>
            ) : (
              <>
                Stripe is not configured. Paid plans are locked until you add{" "}
                <code className="text-xs">STRIPE_*</code> keys.
              </>
            )}
          </div>
        )}

        {message && (
          <p className="mb-4 rounded-xl border border-line bg-panel/50 px-4 py-3 text-sm text-mist">
            {message}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const current = state.plan === plan.id;
            const trialLabel =
              plan.id === "party" && current
                ? formatPartyTrialLabel(state.partyTrialEndsAt)
                : null;
            return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-5 ${
                  plan.highlighted
                    ? "border-teal/50 bg-teal/10"
                    : "border-line bg-panel/50"
                }`}
              >
                <h2 className="font-display text-2xl font-bold text-white">
                  {plan.name}
                </h2>
                <p className="mt-1 text-3xl font-semibold text-teal-soft">
                  {plan.priceMonthly === 0
                    ? "$0"
                    : `$${plan.priceMonthly.toFixed(2)}`}
                  <span className="text-sm font-normal text-mist/70">/mo</span>
                </p>
                {trialLabel && (
                  <p className="mt-2 text-xs font-medium text-teal-soft">
                    {trialLabel}
                  </p>
                )}
                <p className="mt-2 text-sm text-mist">{plan.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm text-mist/90">
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy === plan.id || current}
                  onClick={() => checkout(plan.id)}
                  className="mt-5 w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-50"
                >
                  {current
                    ? "Current plan"
                    : busy === plan.id
                      ? "Working…"
                      : plan.id === "free"
                        ? "Use Free"
                        : config?.stripeReady
                          ? "Subscribe"
                          : config?.devBilling
                            ? "Activate (local)"
                            : "Requires Stripe"}
                </button>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-mist/70">
          Need an account first?{" "}
          <Link href="/auth/signin" className="text-teal-soft hover:underline">
            Sign in
          </Link>{" "}
          or manage billing in{" "}
          <Link href="/settings" className="text-teal-soft hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
