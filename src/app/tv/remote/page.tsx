"use client";

import { AppShell } from "@/components/AppShell";
import { TvRemoteClient } from "@/components/TvPairing";

export default function TvRemotePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg py-4">
        <TvRemoteClient />
      </div>
    </AppShell>
  );
}
