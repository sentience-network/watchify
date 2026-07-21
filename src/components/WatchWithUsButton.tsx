"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics-client";
import { useWatchify } from "@/lib/store";

/** One-tap party from Watching now / presence. */
export function WatchWithUsButton({
  movieId,
  friendUserId,
  compact,
}: {
  movieId: string;
  friendUserId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { canHostParties, currentUserId } = useWatchify();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!currentUserId) return null;

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/watch-with-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          friendUserId,
          inviteFriendIds: friendUserId ? [friendUserId] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start room");
        return;
      }
      track("watch_with_us", {
        partyId: data.partyId,
        source: "presence",
        mode: data.reused ? "reuse" : "create",
      });
      router.push(`/parties/${data.partyId}`);
    } catch {
      setError("Network error — retry");
    } finally {
      setBusy(false);
    }
  }

  if (!canHostParties) {
    return (
      <a
        href="/pricing"
        className={
          compact
            ? "text-[10px] font-medium text-amber-soft underline"
            : "rounded-lg border border-amber/40 px-2.5 py-1.5 text-[11px] text-amber-soft"
        }
        onClick={(e) => e.stopPropagation()}
      >
        Host credit / Party to start
      </a>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className={
          compact
            ? "rounded-md bg-teal/20 px-2 py-1 text-[10px] font-semibold text-teal-soft disabled:opacity-50"
            : "rounded-lg bg-teal px-2.5 py-1.5 text-[11px] font-semibold text-ink disabled:opacity-50"
        }
      >
        {busy ? "Starting…" : "Watch with us"}
      </button>
      {error ? (
        <p className="mt-1 text-[10px] text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
