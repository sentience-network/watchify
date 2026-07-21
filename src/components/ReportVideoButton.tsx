"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type Props = {
  movieId: string;
  /** Optional uploader / related user for UGC. */
  targetUserId?: string;
  compact?: boolean;
};

export function ReportVideoButton({ movieId, targetUserId, compact }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(reason: string) {
    if (!session?.user) {
      setMsg("Sign in to report.");
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetKind: movieId.startsWith("ugc-") ? "upload" : "video",
        targetMovieId: movieId,
        targetUserId: targetUserId || undefined,
        reason,
        details: `Reported title ${movieId}`,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Report failed");
      return;
    }
    setMsg("Report submitted — thank you.");
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "rounded-lg border border-line px-2 py-1 text-[11px] text-mist hover:text-amber-soft"
            : "rounded-xl border border-line px-3 py-2 text-xs text-mist hover:border-amber/40 hover:text-amber-soft"
        }
      >
        Report video
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-ink p-2 shadow-xl">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-mist/60">
            Why report?
          </p>
          {[
            ["illegal_or_harmful", "Illegal / harmful"],
            ["porn_or_sexual", "Porn / sexual content"],
            ["copyright_claim", "Copyright concern"],
            ["spam_or_misleading", "Spam / misleading"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => void submit(id)}
              className="block w-full rounded-lg px-2 py-2 text-left text-xs text-mist hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {msg ? <p className="mt-1 text-[11px] text-mist/70">{msg}</p> : null}
    </div>
  );
}
