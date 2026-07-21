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
        if (dayGap >= 1) {
          track("d1_return", { day: dayGap, source: "app_shell" });
        }
      }
      localStorage.setItem(key, today);
    } catch {
      /* ignore */
    }
    // Best-effort server reminders while any signed-in user is online
    void fetch("/api/cron/reminders").catch(() => undefined);
  }, [session?.user?.id]);

  return null;
}
