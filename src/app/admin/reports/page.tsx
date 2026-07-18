"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { isStaffRole } from "@/lib/roles";

type ReportRow = {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  actionNote: string;
  reporter: { id: string; name: string; handle: string; email: string };
  target: {
    id: string;
    name: string;
    handle: string;
    email: string;
    bannedAt: string | null;
    warnedAt: string | null;
  };
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const staff = isStaffRole(session?.user?.role);

  const load = useCallback(async () => {
    setMsg("");
    const res = await fetch(`/api/admin/reports?status=${filter}`);
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Could not load reports");
      setReports([]);
      return;
    }
    setReports(data.reports || []);
  }, [filter]);

  useEffect(() => {
    if (status === "authenticated" && staff) void load();
  }, [status, staff, load]);

  async function act(
    reportId: string,
    action: "dismiss" | "warn" | "ban"
  ) {
    setBusy(reportId + action);
    setMsg("");
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMsg(data.error || "Action failed");
      return;
    }
    setMsg(`Marked ${action}.`);
    await load();
  }

  if (status === "loading") {
    return (
      <AppShell>
        <p className="text-mist">Loading…</p>
      </AppShell>
    );
  }

  if (!session?.user) {
    return (
      <AppShell>
        <p className="text-mist">
          <Link href="/auth/signin" className="text-teal-soft hover:underline">
            Sign in
          </Link>{" "}
          as a moderator to view the queue.
        </p>
      </AppShell>
    );
  }

  if (!staff) {
    return (
      <AppShell>
        <h1 className="font-display text-2xl font-bold text-white">
          Moderation
        </h1>
        <p className="mt-3 text-sm text-mist">
          Your account does not have mod/admin access. Seeded demo:{" "}
          <code className="text-teal-soft">alex@watchify.app</code> (admin) or{" "}
          <code className="text-teal-soft">jordan@watchify.app</code> (mod).
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Soft moderation
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            Report queue
          </h1>
          <p className="mt-2 text-sm text-mist/80">
            Dismiss, warn (flag), or soft-ban (blocks sign-in / posting).
          </p>
        </header>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              filter === "open"
                ? "bg-teal text-ink"
                : "border border-line text-mist"
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              filter === "all"
                ? "bg-teal text-ink"
                : "border border-line text-mist"
            }`}
          >
            All
          </button>
        </div>

        {msg && (
          <p className="mb-4 rounded-xl border border-line bg-panel/50 px-4 py-2 text-sm text-mist">
            {msg}
          </p>
        )}

        {reports.length === 0 ? (
          <p className="text-sm text-mist">No reports in this filter.</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-line bg-panel/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {r.reason}{" "}
                      <span className="font-normal text-mist/60">
                        · {r.status}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-mist/70">
                      Target: @{r.target.handle} ({r.target.email})
                      {r.target.bannedAt ? " · banned" : ""}
                      {r.target.warnedAt ? " · warned" : ""}
                    </p>
                    <p className="text-xs text-mist/60">
                      Reporter: @{r.reporter.handle} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.details && (
                      <p className="mt-2 text-sm text-mist">{r.details}</p>
                    )}
                    {r.actionNote && (
                      <p className="mt-1 text-xs text-mist/50">
                        Note: {r.actionNote}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/profile/${r.target.id}`}
                    className="text-xs text-teal-soft hover:underline"
                  >
                    Profile
                  </Link>
                </div>
                {r.status === "open" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(r.id, "dismiss")}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(r.id, "warn")}
                      className="rounded-lg border border-amber/40 px-3 py-1.5 text-xs text-amber-soft disabled:opacity-50"
                    >
                      Warn flag
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(r.id, "ban")}
                      className="rounded-lg bg-amber/20 px-3 py-1.5 text-xs font-semibold text-amber-soft disabled:opacity-50"
                    >
                      Soft-ban
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
