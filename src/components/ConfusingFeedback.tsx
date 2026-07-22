"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Soft-launch “confusing?” feedback — writes an analytics event (and optional
 * self-report) with route + party mode context.
 */
export function ConfusingFeedback() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
  }, [pathname]);

  if (!session?.user?.id) return null;

  async function submit() {
    setBusy(true);
    const partyMode =
      typeof document !== "undefined"
        ? document.body.dataset.partySyncMode || ""
        : "";
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: pathname,
        details: note,
        partyMode,
      }),
    });
    setBusy(false);
    setDone(true);
    setNote("");
    window.setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 1600);
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--chrome-stack)+0.75rem)] right-3 z-[55] md:bottom-[calc(var(--chrome-stack)+0.5rem)]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-full border border-line bg-panel/95 px-3 py-2 text-[11px] font-medium text-mist shadow-lg backdrop-blur hover:border-teal/40 hover:text-white"
        >
          Confusing?
        </button>
      ) : (
        <div className="pointer-events-auto w-[min(280px,86vw)] rounded-2xl border border-line bg-ink/95 p-3 shadow-xl backdrop-blur">
          <p className="font-display text-sm font-semibold text-white">
            What felt confusing?
          </p>
          <p className="mt-0.5 text-[10px] text-mist/60">
            Soft-launch feedback · {pathname}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. didn’t know if Netflix would play here…"
            className="mt-2 w-full rounded-lg border border-line bg-panel/80 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-teal/35"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => void submit()}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {done ? "Sent" : busy ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
