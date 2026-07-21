"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchify } from "@/lib/store";

/**
 * Trial / free-host → second party conversion (post-recap + ~day-25 nudge).
 */
export function TrialHostAgainCta({
  variant = "banner",
}: {
  variant?: "banner" | "inline";
}) {
  const { state, canHostParties, openParties, currentUserId } = useWatchify();

  const hostedCount = openParties.filter((p) => p.hostId === currentUserId).length;
  const endedHint = useMemo(() => {
    try {
      return Number(localStorage.getItem("watchify_hosted_lifetime") || "0");
    } catch {
      return 0;
    }
  }, []);

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

  const day25 =
    onTrial && daysLeft != null && daysLeft <= 5 && daysLeft >= 0;
  const postFirst =
    canHostParties && (hostedCount >= 1 || endedHint >= 1) && (onTrial || freeCredit);

  if (!day25 && !postFirst && !freeCredit) return null;

  const className =
    variant === "inline"
      ? "mt-3 rounded-xl border border-teal/35 bg-teal/10 p-3"
      : "mb-4 rounded-xl border border-teal/35 bg-teal/10 p-4";

  return (
    <aside className={className} aria-label="Host again">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">
        {day25 ? "Trial wrapping up" : "Host again"}
      </p>
      <p className="mt-1 text-sm text-white">
        {day25
          ? `About ${daysLeft} day(s) left on Party trial — lock a second room while hosting is unlocked.`
          : freeCredit && !onTrial
            ? "You still have a free host credit — start another party before it expires with the night."
            : "Great first party. Host again this week while trial / credit is live."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/parties?create=1"
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Host another party
        </Link>
        <Link
          href="/pricing"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Keep Party
        </Link>
      </div>
    </aside>
  );
}
