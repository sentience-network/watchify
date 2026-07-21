"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWatchify } from "@/lib/store";

const KEY = "watchify_host_onboarding_v2";

/**
 * First-night coach for soft launch: Free watch → Share → Party → Invite.
 */
export function HostOnboarding() {
  const { data: session } = useSession();
  const { canHostParties, openParties, currentUserId, state } = useWatchify();
  const [open, setOpen] = useState(false);
  const [fromTrialSignup, setFromTrialSignup] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("trial") === "1") setFromTrialSignup(true);
      }
      if (localStorage.getItem(KEY)) return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [session?.user]);

  if (!open || !session?.user) return null;

  const hosted = openParties.some((p) => p.hostId === currentUserId);
  const watching = Boolean(state.currentlyWatchingId);
  const onTrial =
    state.plan === "party" &&
    Boolean(state.partyTrialEndsAt) &&
    !state.stripeSubscriptionId;
  const inviteDone = (() => {
    try {
      return (
        localStorage.getItem("watchify_invite_copied") === "1" ||
        Number(localStorage.getItem("watchify_invite_share_count") || "0") >= 1
      );
    } catch {
      return false;
    }
  })();

  const steps = canHostParties
    ? [
        {
          done: watching,
          label: watching
            ? "Playing / sharing a title"
            : "Play something free on Watchify",
          href: "/library",
        },
        {
          done: watching,
          label: watching
            ? "Friends can see what you’re watching"
            : "Share what you’re watching (Discover dock)",
          href: "/discover",
        },
        {
          done: hosted,
          label: hosted
            ? "You’ve hosted a live party"
            : onTrial
              ? "Host a party (Party trial unlocked)"
              : state.plan === "party"
                ? "Host a Watchify Free party"
                : "Host your free party credit",
          href: "/parties",
        },
        {
          done: inviteDone,
          label: inviteDone
            ? "Invite link shared"
            : "Invite 2 friends with the share link",
          href: "/parties",
        },
      ]
    : [
        {
          done: watching,
          label: watching
            ? "Playing / sharing a title"
            : "Play something free on Watchify",
          href: "/library",
        },
        {
          done: Boolean(canHostParties),
          label: "Upgrade to Party to host more rooms",
          href: "/pricing",
        },
        {
          done: hosted,
          label: hosted ? "You’ve hosted a room" : "Create your first live party",
          href: "/parties",
        },
        {
          done: inviteDone,
          label: inviteDone
            ? "Invite link shared"
            : "Invite 2 friends with the share link",
          href: "/parties",
        },
      ];

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <aside
      className="mb-6 rounded-2xl border border-teal/35 bg-teal/10 p-4 animate-fade-up"
      aria-label="First night onboarding"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">
            {fromTrialSignup || onTrial
              ? "Party trial active"
              : "Your first night"}
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-white">
            Free → Share → Party → Invite
          </p>
          <p className="mt-1 text-xs text-mist/80">
            {onTrial
              ? "You have 30 days of Party free — host rooms, face video, and Party cosmetics. Run this once on two devices."
              : canHostParties
                ? "Hosting is unlocked. Run this once on two devices — that’s the whole product."
                : "Start free, then unlock hosting when you’re ready for a room."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-mist hover:text-white"
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                s.done
                  ? "border-teal/20 bg-ink/30 text-teal-soft"
                  : "border-line bg-ink/40 text-white hover:border-teal/40"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-mist">
                {s.done ? "✓" : i + 1}
              </span>
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/library"
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Start with free library
        </Link>
        <Link
          href="/parties"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Parties
        </Link>
        <Link
          href="/contact?topic=soft-launch"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Something broken?
        </Link>
        {(session?.user?.role === "admin" ||
          session?.user?.role === "mod") && (
          <Link
            href="/soft-launch"
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
          >
            Soft-launch script
          </Link>
        )}
      </div>
    </aside>
  );
}
