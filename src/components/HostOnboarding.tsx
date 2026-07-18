"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWatchify } from "@/lib/store";

const KEY = "watchify_host_onboarding_v1";

/**
 * First-run host coaching — drives Watch → Share → Party → Invite.
 */
export function HostOnboarding() {
  const { data: session } = useSession();
  const { canHostParties, openParties, currentUserId } = useWatchify();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    try {
      if (localStorage.getItem(KEY)) return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [session?.user]);

  if (!open || !session?.user) return null;

  const hosted = openParties.some((p) => p.hostId === currentUserId);
  const steps = [
    {
      done: true,
      label: "Account ready",
      href: "/settings",
    },
    {
      done: Boolean(canHostParties),
      label: canHostParties ? "Party plan active" : "Activate Party plan (host rooms)",
      href: "/pricing",
    },
    {
      done: hosted,
      label: hosted ? "You’ve hosted a room" : "Create your first live party",
      href: "/parties",
    },
    {
      done: false,
      label: "Invite 2 friends with the share link",
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
      aria-label="Launch onboarding"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">
            Your first night
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-white">
            Watch → Share → Party → Invite
          </p>
          <p className="mt-1 text-xs text-mist/80">
            This is the flywheel. Complete it once and the graph starts compounding.
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
          href="/soft-launch"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Soft-launch script
        </Link>
        <Link
          href="/tv"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Open TV companion
        </Link>
        <Link
          href="/discover"
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Share what you&apos;re watching
        </Link>
      </div>
    </aside>
  );
}
