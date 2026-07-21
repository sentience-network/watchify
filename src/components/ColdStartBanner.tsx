"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWatchify } from "@/lib/store";

/**
 * Honest “server waking” UI during first hydrate after Render sleep.
 */
export function ColdStartBanner() {
  const { status } = useSession();
  const { ready, serverHydrated, hydratingSlow } = useWatchify();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setVisible(false);
      return;
    }
    if (serverHydrated) {
      setVisible(false);
      return;
    }
    if (hydratingSlow || !ready) {
      setVisible(true);
      return;
    }
    // Show briefly while waiting for first server state
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, [status, serverHydrated, hydratingSlow, ready]);

  if (!visible || status !== "authenticated" || serverHydrated) return null;

  return (
    <div
      className="mb-4 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 animate-fade-up"
      role="status"
    >
      <p className="font-display text-sm font-semibold text-amber-soft">
        Waking the server…
      </p>
      <p className="mt-1 text-xs leading-relaxed text-mist/80">
        Soft launch on free Render can take 30–60 seconds after sleep. Your
        session is fine — hang tight while friends + parties load. This is not a
        wrong password.
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/50">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-amber" />
      </div>
    </div>
  );
}
