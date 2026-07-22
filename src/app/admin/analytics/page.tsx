"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { isStaffRole } from "@/lib/roles";

const labels: Record<string, string> = {
  landing_view: "Landing views",
  signup_started: "Signup starts",
  signup_completed: "Signups",
  presence_shared: "Presence shares",
  party_created: "Parties created",
  invite_copied: "Invites copied",
  invite_opened: "Invites opened",
  party_joined: "Party joins",
  first_message: "First messages",
  return_visit: "Return visits",
  video_joined: "Video joins",
  ready_status: "Ready status taps",
  scrub_opened: "Scrub / open service",
  d1_return: "D1 returns",
  invite_depth: "Invite depth events",
  guest_joined: "Guest joins",
  watch_with_us: "Watch with us",
  party_multi: "Multi-person room events",
};

type PitchMetricPct = {
  label: string;
  valuePct: number;
  targetPct: number;
  hit: boolean;
  numerator: number;
  denominator: number;
  note: string;
};

type PitchMetricDepth = {
  label: string;
  value: number;
  target: number;
  hit: boolean;
  note: string;
};

type PitchBlock = {
  inviteToJoin: PitchMetricPct;
  roomsMulti: PitchMetricPct;
  d1Return: PitchMetricPct;
  inviteDepth: PitchMetricDepth;
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [pitch, setPitch] = useState<PitchBlock | null>(null);
  const [error, setError] = useState("");
  const staff = isStaffRole(session?.user?.role);

  useEffect(() => {
    if (!staff) return;
    fetch("/api/admin/analytics?days=30")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCounts(data.counts);
        setPitch(data.pitch);
      })
      .catch((reason) => setError(reason.message || "Could not load analytics"));
  }, [staff]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-white">
          Soft-launch funnel
        </h1>
        <p className="mt-2 text-sm text-mist">
          Last 30 days · real events only (no chat, titles, email, or IP). Copy
          these into{" "}
          <code className="text-teal-soft">docs/pitch/PITCH_ONE_PAGER.md</code>{" "}
          vs{" "}
          <code className="text-teal-soft">docs/LAUNCH_2_WEEKS.md</code>{" "}
          targets.
        </p>
        {status === "loading" ? (
          <p className="mt-6 text-mist">Loading…</p>
        ) : !staff ? (
          <p className="mt-6 text-amber-soft">
            Moderator or admin access is required.
          </p>
        ) : error ? (
          <p className="mt-6 text-amber-soft" role="alert">
            {error}
          </p>
        ) : !counts || !pitch ? (
          <p className="mt-6 text-mist" role="status">
            Loading funnel…
          </p>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-teal/35 bg-teal/5 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    Pitch metrics
                  </h2>
                  <p className="mt-1 text-xs text-mist/70">
                    Against LAUNCH_2_WEEKS targets — green = hit, amber = short.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/admin/analytics?days=30&format=csv"
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
                  >
                    Export CSV
                  </a>
                  <a
                    href="/api/admin/analytics?days=30&format=json"
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
                  >
                    Export JSON
                  </a>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    pitch.inviteToJoin,
                    pitch.roomsMulti,
                    pitch.d1Return,
                  ] as PitchMetricPct[]
                ).map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-xl border p-4 ${
                      m.hit
                        ? "border-teal/40 bg-teal/10"
                        : "border-amber/35 bg-amber/5"
                    }`}
                  >
                    <p className="text-xs text-mist/70">{m.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {m.valuePct}%
                      <span className="ml-2 text-sm font-normal text-mist/60">
                        target ≥{m.targetPct}%
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-mist/55">
                      {m.numerator}/{m.denominator || "—"} · {m.note}
                    </p>
                  </div>
                ))}
                <div
                  className={`rounded-xl border p-4 ${
                    pitch.inviteDepth.hit
                      ? "border-teal/40 bg-teal/10"
                      : "border-amber/35 bg-amber/5"
                  }`}
                >
                  <p className="text-xs text-mist/70">{pitch.inviteDepth.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {pitch.inviteDepth.value}
                    <span className="ml-2 text-sm font-normal text-mist/60">
                      target ≥{pitch.inviteDepth.target}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-mist/55">
                    {pitch.inviteDepth.note}
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-panel/50 p-4">
                <p className="text-xs text-mist/70">Landing → signup</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {counts.landing_view
                    ? Math.round(
                        ((counts.signup_completed || 0) / counts.landing_view) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="rounded-xl border border-line bg-panel/50 p-4">
                <p className="text-xs text-mist/70">Invite → joined (raw)</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {pitch.inviteToJoin.valuePct}%
                </p>
              </div>
              <div className="rounded-xl border border-line bg-panel/50 p-4">
                <p className="text-xs text-mist/70">Joined → first message</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {counts.party_joined
                    ? Math.round(
                        ((counts.first_message || 0) / counts.party_joined) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(labels).map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-xl border border-line bg-panel/50 p-4"
                >
                  <p className="text-xs text-mist/70">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {counts[key] || 0}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
        <Link
          href="/admin/reports"
          className="mt-6 inline-block text-sm text-teal-soft"
        >
          Moderation queue →
        </Link>
      </div>
    </AppShell>
  );
}
