"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/** After guest join — prompt convert to a real account (merge preserves party history). */
export function GuestConvertPrompt() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isGuest =
      Boolean(session?.user?.isGuest) ||
      Boolean(session?.user?.email?.endsWith("@guest.watchify.local"));
    if (!isGuest) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [session?.user]);

  if (!open || !session?.user) return null;
  const isGuest =
    session.user.isGuest ||
    session.user.email?.endsWith("@guest.watchify.local");
  if (!isGuest) return null;

  const callback = "/parties";
  const signupHref = `/auth/signup?from=guest&callbackUrl=${encodeURIComponent(callback)}`;
  const signinHref = `/auth/signin?from=guest&callbackUrl=${encodeURIComponent(callback)}`;

  return (
    <aside
      className="fixed bottom-[4.5rem] left-3 right-3 z-50 mx-auto max-w-lg rounded-2xl border border-amber/40 bg-panel/95 p-4 shadow-2xl backdrop-blur md:left-auto md:right-6"
      role="status"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-soft">
        Guest session
      </p>
      <p className="mt-1 text-sm text-white">
        You&apos;re in the room — save a free account to keep this party,
        chat, and Ready history on the same profile (not a new empty account).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={signupHref}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Save my account
        </Link>
        <Link
          href={signinHref}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Link existing account
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem("watchify_guest_convert");
            } catch {
              /* ignore */
            }
            setOpen(false);
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
        >
          Keep watching as guest
        </button>
      </div>
    </aside>
  );
}
