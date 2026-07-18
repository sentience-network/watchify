"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { NowWatchingBar } from "./NowWatchingBar";
import { SiteFooter } from "./SiteFooter";
import { CookieBanner } from "./CookieBanner";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { InstallAppBanner } from "./InstallAppBanner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-36 pt-6 md:px-8 md:pb-28 md:pt-8">
        <VerifyEmailBanner />
        {children}
        <SiteFooter />
      </main>
      <NowWatchingBar />
      <InstallAppBanner />
      <CookieBanner />
    </div>
  );
}
