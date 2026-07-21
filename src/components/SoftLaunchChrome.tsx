"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ColdStartBanner } from "./ColdStartBanner";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { InstallAppBanner } from "./InstallAppBanner";
import { CookieBanner } from "./CookieBanner";
import { useWatchify } from "@/lib/store";

/**
 * Soft-launch chrome: at most one priority banner so mobile isn’t
 * stacked with verify + cold-start + install + cookie.
 *
 * Priority: cold wake → verify email → cookie → install PWA.
 */
export function SoftLaunchChrome() {
  const { status, data: session } = useSession();
  const { ready, serverHydrated, hydratingSlow, state } = useWatchify();
  const [coldVisible, setColdVisible] = useState(false);
  const [installEligible, setInstallEligible] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setColdVisible(false);
      return;
    }
    if (serverHydrated) {
      setColdVisible(false);
      return;
    }
    if (hydratingSlow || !ready) {
      setColdVisible(true);
      return;
    }
    const t = window.setTimeout(() => setColdVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, [status, serverHydrated, hydratingSlow, ready]);

  useEffect(() => {
    try {
      setInstallEligible(!localStorage.getItem("watchify_install_dismissed"));
    } catch {
      setInstallEligible(false);
    }
  }, []);

  const needsVerify =
    status === "authenticated" &&
    Boolean(session?.user?.id) &&
    !session?.user?.emailVerified;

  const cookieNeeded = ready && state.cookieConsent === "unknown";

  const slot: "cold" | "verify" | "cookie" | "install" | null = coldVisible
    ? "cold"
    : needsVerify
      ? "verify"
      : cookieNeeded
        ? "cookie"
        : installEligible
          ? "install"
          : null;

  return (
    <>
      {slot === "cold" ? <ColdStartBanner /> : null}
      {slot === "verify" ? <VerifyEmailBanner /> : null}
      {slot === "install" ? <InstallAppBanner /> : null}
      {slot === "cookie" ? <CookieBanner /> : null}
    </>
  );
}
