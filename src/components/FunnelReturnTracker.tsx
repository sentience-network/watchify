"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { track } from "@/lib/analytics-client";

/** D1 return + opportunistic reminder cron tick while the app is open. */
export function FunnelReturnTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      const key = "watchify_last_visit_day";
      const today = new Date().toISOString().slice(0, 10);
      const prev = localStorage.getItem(key);
      if (prev && prev !== today) {
        const prevMs = Date.parse(`${prev}T12:00:00Z`);
        const dayGap = Math.round((Date.now() - prevMs) / 86_400_000);
        // Strict D1: first return the calendar day after last visit
        if (dayGap === 1) {
          track("d1_return", { day: 1, source: "app_shell" });
        } else if (dayGap > 1) {
          track("return_visit", { day: dayGap, source: "app_shell" });
        }
      }
      localStorage.setItem(key, today);
    } catch {
      /* ignore */
    }

    const tick = () => {
      void fetch("/api/cron/reminders").catch(() => undefined);
    };
    tick();
    // Keep reminders reliable without paid Render cron while anyone is signed in
    const id = window.setInterval(tick, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [session?.user?.id]);

  return null;
}
