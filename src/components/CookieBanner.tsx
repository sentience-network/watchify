"use client";

import Link from "next/link";
import { useWatchify } from "@/lib/store";

export function CookieBanner() {
  const { ready, state, setCookieConsent } = useWatchify();
  if (!ready || state.cookieConsent !== "unknown") return null;

  return (
    <div className="fixed bottom-[var(--banner-offset)] left-3 right-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-panel/95 p-4 shadow-bar backdrop-blur">
      <p className="text-sm text-mist">
        Watchify uses essential cookies for sign-in and local storage for your
        queues. Accept enables optional third-party product analytics; essential-only
        still permits content-free internal aggregate counts. See our{" "}
        <Link href="/privacy" className="text-teal-soft hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCookieConsent("accepted")}
          className="min-h-[var(--tap-min)] rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setCookieConsent("essential")}
          className="min-h-[var(--tap-min)] rounded-lg border border-line px-4 py-2 text-xs text-mist hover:text-white"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
