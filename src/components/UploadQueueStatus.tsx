"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UploadRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  catalogId?: string;
  flagReasons?: string[];
};

const STATUS_COPY: Record<string, string> = {
  pending: "Pending review — usually within a day on soft launch.",
  approved: "Live in the community shelf.",
  quarantined: "Held for mod review — not public yet.",
  rejected: "Rejected — see reason or contact support.",
};

/** Submitter SLA view: pending / live / rejected. */
export function UploadQueueStatus() {
  const [rows, setRows] = useState<UploadRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/uploads/mine")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setRows(data.uploads || []);
      })
      .catch((err) => setError(err.message || "Could not load queue"));
  }, []);

  if (error) {
    return (
      <p className="mt-4 text-sm text-amber-soft" role="alert">
        {error}
      </p>
    );
  }
  if (!rows) {
    return (
      <p className="mt-4 text-sm text-mist" role="status">
        Loading your upload queue…
      </p>
    );
  }
  if (!rows.length) {
    return (
      <p className="mt-4 text-xs text-mist/65">
        No submissions yet. After you post, status shows here (pending → live or
        rejected).
      </p>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel/40 p-4">
      <h2 className="font-display text-lg font-semibold text-white">
        Your upload queue
      </h2>
      <p className="mt-1 text-xs text-mist/70">
        Soft-launch SLA: pending items are reviewed by mods; approved titles appear
        in Library. Hosts see a trust signal on live community videos.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-line/70 bg-ink/30 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">{u.title}</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  u.status === "approved"
                    ? "bg-teal/20 text-teal-soft"
                    : u.status === "rejected"
                      ? "bg-amber/20 text-amber-soft"
                      : "bg-mist/15 text-mist"
                }`}
              >
                {u.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-mist/70">
              {STATUS_COPY[u.status] || u.status}
            </p>
            {u.status === "approved" && u.catalogId ? (
              <Link
                href={`/watch/${u.catalogId}`}
                className="mt-1 inline-block text-[11px] text-teal-soft underline"
              >
                Open live video
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small trust chip for hosts/joiners on community uploads. */
export function UploadTrustSignal({
  status,
}: {
  status?: string | null;
}) {
  if (!status) return null;
  if (status === "approved") {
    return (
      <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal-soft">
        Mod-reviewed community upload
      </span>
    );
  }
  if (status === "pending" || status === "quarantined") {
    return (
      <span className="rounded-md border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-soft">
        Awaiting review
      </span>
    );
  }
  return null;
}
