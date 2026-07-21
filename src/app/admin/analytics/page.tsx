"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { isStaffRole } from "@/lib/roles";

const labels: Record<string, string> = {
  landing_view: "Landing views", signup_started: "Signup starts", signup_completed: "Signups",
  presence_shared: "Presence shares", party_created: "Parties created", invite_copied: "Invites copied",
  invite_opened: "Invites opened", party_joined: "Party joins", first_message: "First messages", return_visit: "Return visits",
  video_joined: "Video joins", ready_status: "Ready status taps", scrub_opened: "Scrub / open service",
  d1_return: "D1+ returns", invite_depth: "Invite depth", guest_joined: "Guest joins", watch_with_us: "Watch with us",
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");
  const staff = isStaffRole(session?.user?.role);
  useEffect(() => {
    if (!staff) return;
    fetch("/api/admin/analytics?days=30").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCounts(data.counts);
    }).catch((reason) => setError(reason.message || "Could not load analytics"));
  }, [staff]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-white">Soft-launch funnel</h1>
        <p className="mt-2 text-sm text-mist">Last 30 days · aggregate events only; no chat text, title names, email, or raw IP addresses.</p>
        {status === "loading" ? <p className="mt-6 text-mist">Loading…</p> : !staff ? (
          <p className="mt-6 text-amber-soft">Moderator or admin access is required.</p>
        ) : error ? <p className="mt-6 text-amber-soft" role="alert">{error}</p> : !counts ? (
          <p className="mt-6 text-mist" role="status">Loading funnel…</p>
        ) : (
          <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-4"><p className="text-xs text-mist/70">Landing → signup</p><p className="mt-1 text-xl font-semibold text-white">{counts.landing_view ? Math.round((counts.signup_completed || 0) / counts.landing_view * 100) : 0}%</p></div>
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-4"><p className="text-xs text-mist/70">Invite → joined</p><p className="mt-1 text-xl font-semibold text-white">{counts.invite_opened ? Math.round((counts.party_joined || 0) / counts.invite_opened * 100) : 0}%</p></div>
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-4"><p className="text-xs text-mist/70">Joined → first message</p><p className="mt-1 text-xl font-semibold text-white">{counts.party_joined ? Math.round((counts.first_message || 0) / counts.party_joined * 100) : 0}%</p></div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(labels).map(([key, label]) => (
              <div key={key} className="rounded-xl border border-line bg-panel/50 p-4">
                <p className="text-xs text-mist/70">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{counts[key] || 0}</p>
              </div>
            ))}
          </div>
          </>
        )}
        <Link href="/admin/reports" className="mt-6 inline-block text-sm text-teal-soft">Moderation queue →</Link>
      </div>
    </AppShell>
  );
}
