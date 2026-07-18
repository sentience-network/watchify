"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function BillingCancelPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
          Billing
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Checkout canceled
        </h1>
        <p className="mt-4 text-sm text-mist">
          No charge was made. Your existing plan is unchanged — the database
          remains the source of truth.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Back to pricing
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
          >
            Settings
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
