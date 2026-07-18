"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useWatchify } from "@/lib/store";

export default function BillingSuccessPage() {
  const { data: session, status } = useSession();
  const { refreshFromServer, state } = useWatchify();
  const [msg, setMsg] = useState("Confirming subscription with Stripe…");
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setError("Sign in to confirm your subscription.");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      // Fallback: refresh plan from DB (webhook may have landed)
      void refreshFromServer().then(() => {
        setPlan(null);
        setMsg(
          "No checkout session id — refreshed your account plan from the server. If you just paid, wait a moment for the webhook."
        );
      });
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "Could not verify checkout session");
        // Still refresh DB in case webhook already wrote the plan
        await refreshFromServer();
        return;
      }
      setPlan(data.plan);
      setMsg(
        `Subscription confirmed. Your plan is now ${data.plan} (from Stripe + database — not the URL alone).`
      );
      await refreshFromServer();
    })();
    return () => {
      cancelled = true;
    };
  }, [session, status, refreshFromServer]);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
          Billing
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Subscription success
        </h1>
        {error ? (
          <p className="mt-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-soft">
            {error}
          </p>
        ) : (
          <p className="mt-4 rounded-xl border border-line bg-panel/50 px-4 py-3 text-sm text-mist">
            {msg}
          </p>
        )}
        <p className="mt-3 text-sm text-mist">
          Current account plan:{" "}
          <span className="font-semibold text-teal-soft">
            {plan || state.plan}
          </span>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Back to settings
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
          >
            Pricing
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
