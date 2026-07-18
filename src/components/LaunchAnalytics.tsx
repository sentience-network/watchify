"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics-client";
import { useWatchify } from "@/lib/store";

export function LaunchAnalytics() {
  const pathname = usePathname();
  const { state, ready } = useWatchify();
  useEffect(() => {
    if (pathname === "/") track("landing_view");
    const key = "watchify_last_visit";
    const previous = Number(localStorage.getItem(key) || 0);
    if (previous && Date.now() - previous > 12 * 60 * 60 * 1000) track("return_visit");
    localStorage.setItem(key, String(Date.now()));
  }, [pathname]);

  useEffect(() => {
    if (!ready || state.cookieConsent !== "accepted") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) return;
    void import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, { api_host: host, person_profiles: "identified_only", capture_pageview: false, persistence: "memory" });
      }
      posthog.capture("$pageview", { path: pathname });
    });
  }, [ready, state.cookieConsent, pathname]);
  return null;
}
