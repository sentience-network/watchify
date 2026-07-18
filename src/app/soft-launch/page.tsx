"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";

const STEPS = [
  {
    n: 1,
    title: "Create / sign in",
    detail: "Use a real email if testing verify/reset; seed accounts work for multi-browser.",
    href: "/auth/signin",
  },
  {
    n: 2,
    title: "Share what you're watching",
    detail: "Pick a title on Discover, then Share from the dock (goes public automatically).",
    href: "/discover",
  },
  {
    n: 3,
    title: "Host a Watchify Free party",
    detail: "Party plan required. Create a room with sync mode Watchify Free.",
    href: "/parties",
  },
  {
    n: 4,
    title: "Copy invite → second browser",
    detail: "Incognito as a second user. Join via /share/party/… then chat + play/pause.",
    href: "/parties",
  },
  {
    n: 5,
    title: "Face video + screen share",
    detail: "Join video room, mute/camera toggle, Share screen with party (not paid streamers).",
    href: "/parties",
  },
  {
    n: 6,
    title: "TV companion",
    detail: "Open /tv on a living-room browser or tablet. Confirm live parties + presence.",
    href: "/tv",
  },
  {
    n: 7,
    title: "Install PWA",
    detail: "Browser → Install Watchify. Confirm Discover opens standalone.",
    href: "/discover",
  },
  {
    n: 8,
    title: "Staff checks",
    detail: "Mod queue + analytics (alex/jordan). Confirm non-staff denied.",
    href: "/admin/analytics",
  },
];

/**
 * Interactive soft-launch checklist for the 10–20 person test week.
 */
export default function SoftLaunchPage() {
  const { data: session } = useSession();
  const staff =
    session?.user?.role === "admin" || session?.user?.role === "mod";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Soft launch
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            Tester script
          </h1>
          <p className="mt-2 text-sm text-mist/80">
            Run these in order. Record device, network, and whether you would invite a
            friend. Full ops checklist:{" "}
            <code className="text-teal-soft">docs/LAUNCH_2_WEEKS.md</code>
          </p>
          {session?.user ? (
            <p className="mt-2 text-xs text-teal-soft">
              Signed in as {session.user.email}
              {staff ? " · staff" : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-soft">Sign in to unlock staff steps.</p>
          )}
        </header>

        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="block rounded-2xl border border-line bg-panel/50 p-4 transition hover:border-teal/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">
                  Step {s.n}
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-white">
                  {s.title}
                </p>
                <p className="mt-1 text-sm text-mist/80">{s.detail}</p>
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-mist/70">
          Health:{" "}
          <Link href="/api/health" className="text-teal-soft hover:underline">
            /api/health
          </Link>
          {" · "}
          <Link href="/api/stats" className="text-teal-soft hover:underline">
            /api/stats
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
