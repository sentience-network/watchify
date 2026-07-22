"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { NowWatchingBar } from "./NowWatchingBar";
import { SiteFooter } from "./SiteFooter";
import { SoftLaunchChrome } from "./SoftLaunchChrome";
import { SocialAlerts } from "./SocialAlerts";
import { PartyLifecycleAlerts } from "./PartyLifecycleAlerts";
import { ConfusingFeedback } from "./ConfusingFeedback";
import { FinishedSocialBeat } from "./FinishedSocialBeat";
import { GuestConvertPrompt } from "./GuestConvertPrompt";
import { GuestMergeBridge } from "./GuestMergeBridge";
import { FunnelReturnTracker } from "./FunnelReturnTracker";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-[calc(var(--chrome-stack)+1.25rem)] pt-[max(1.5rem,env(safe-area-inset-top,0px))] md:px-8 md:pb-[calc(var(--chrome-stack)+1.5rem)] md:pt-8">
        <SoftLaunchChrome />
        <FunnelReturnTracker />
        <GuestMergeBridge />
        {children}
        <SiteFooter />
      </main>
      <NowWatchingBar />
      <FinishedSocialBeat />
      <ConfusingFeedback />
      <SocialAlerts />
      <PartyLifecycleAlerts />
      <GuestConvertPrompt />
    </div>
  );
}
