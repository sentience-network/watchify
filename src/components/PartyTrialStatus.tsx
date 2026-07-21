"use client";

import Link from "next/link";
import { formatPartyTrialLabel } from "@/lib/party-trial";

/** Compact trial / free-host status for Settings, Pricing, onboarding. */
export function PartyTrialStatus({
  plan,
  partyTrialEndsAt,
  freeHostsRemaining,
  stripeSubscriptionId,
  className = "",
}: {
  plan: string;
  partyTrialEndsAt?: string | null;
  freeHostsRemaining?: number;
  stripeSubscriptionId?: string | null;
  className?: string;
}) {
  if (stripeSubscriptionId) return null;
  const trialLabel = formatPartyTrialLabel(partyTrialEndsAt);
  if (trialLabel && plan === "party") {
    return (
      <p className={`text-sm text-teal-soft ${className}`}>
        {trialLabel}.{" "}
        <Link href="/pricing" className="underline hover:text-white">
          Keep Party after trial
        </Link>
      </p>
    );
  }
  if (plan !== "party" && (freeHostsRemaining ?? 0) > 0) {
    return (
      <p className={`text-sm text-mist ${className}`}>
        Free host credit: {freeHostsRemaining} party left — then upgrade to host
        unlimited rooms.
      </p>
    );
  }
  return null;
}
