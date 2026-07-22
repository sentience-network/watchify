"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWatchify } from "@/lib/store";

/**
 * Trial / free-host → second party conversion (post-recap + mid-trial + day-N nudge).
 */
export function TrialHostAgainCta({
  variant = "banner",
}: {
  variant?: "banner" | "inline";
}) {
  const { state, canHostParties, openParties, currentUserId } = useWatchify();
  const [hostedLifetime, setHostedLifetime] = useState(0);

  useEffect(() => {
    try {
      setHostedLifetime(Number(localStorage.getItem("watchify_hosted_lifetime") || "0"));
    } catch {
      setHostedLifetime(0);
    }
  }, [openParties.length]);

  const openHosted = openParties.filter((p) => p.hostId === currentUserId).length;
  const hostedCount = Math.max(openHosted, hostedLifetime);

  const onTrial =
    state.plan === "party" &&
    Boolean(state.partyTrialEndsAt) &&
    !state.stripeSubscriptionId;

  const daysLeft = useMemo(() => {
    if (!state.partyTrialEndsAt) return null;
    const ms = new Date(state.partyTrialEndsAt).getTime() - Date.now();
    return Math.ceil(ms / 86_400_000);
  }, [state.partyTrialEndsAt]);

  const freeCredit =
    state.plan !== "party" && (state.freeHostsRemaining ?? 0) > 0;

  const dayN =
    onTrial && daysLeft != null && daysLeft <= 7 && daysLeft >= 0;
  const postFirst =
    canHostParties && hostedCount >= 1 && (onTrial || freeCredit);
  const midTrialNudge =
    onTrial && hostedCount >= 1 && daysLeft != null && daysLeft <= 23 && daysLeft > 7;

  // Free credit alone before first host — only show after they've hosted once
  // or when trial is ending / post-first.
  if (!dayN && !postFirst && !midTrialNudge) return null;
  // Avoid noisy free-credit banner for never-hosted users (HostOnboarding covers that)
  if (freeCredit && !onTrial && hostedCount < 1) return null;

  const className =
    variant === "inline"
      ? "mt-3 rounded-xl border border-teal/35 bg-teal/10 p-3"
      : "mb-4 rounded-xl border border-teal/35 bg-teal/10 p-4";

  const headline = dayN
    ? "Trial wrapping up"
    : midTrialNudge
      ? "Second host this week"
      : "Host again tonight";

  const body = dayN
    ? `About ${daysLeft} day(s) left on Party trial — host one more room while it's unlocked.`
    : midTrialNudge
      ? "You already hosted once. Lock a second party this week (or same time next week) while trial is live."
      : freeCredit && !onTrial
        ? "You still have a free host credit — start another party before the night ends."
        : "Great first party. Host again within 7 days while trial / credit is live.";

  return (
    <aside className={className} aria-label="Host again">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">
        {headline}
      </p>
      <p className="mt-1 text-sm text-white">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/parties?create=1"
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Host another party
        </Link>
        <Link
          href="/parties?create=1&club=1"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Same time next week
        </Link>
      </div>
    </aside>
  );
}
