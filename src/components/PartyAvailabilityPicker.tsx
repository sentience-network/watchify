"use client";

import { useEffect, useState } from "react";
import {
  AVAILABILITY_LABELS,
  type PartyAvailability,
  type PartyAvailabilityStatus,
} from "@/lib/party-availability";

export function PartyAvailabilityPicker({
  value,
  onSave,
}: {
  value: PartyAvailability;
  onSave: (next: PartyAvailability) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<PartyAvailabilityStatus>(value.status);
  const [until, setUntil] = useState(value.until?.slice(0, 16) || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setStatus(value.status);
    setUntil(value.until?.slice(0, 16) || "");
  }, [value]);

  async function save() {
    setBusy(true);
    setMsg("");
    await onSave({
      status,
      until: until ? new Date(until).toISOString() : null,
    });
    setBusy(false);
    setMsg("Saved — friends see this on Discover & your profile.");
  }

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-5">
      <h2 className="font-display text-lg font-semibold text-white">
        Open to party?
      </h2>
      <p className="mt-1 text-xs text-mist/70">
        Ambient availability — not what you’re watching. Friends use this before
        they invite.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(AVAILABILITY_LABELS) as PartyAvailabilityStatus[]).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                status === s
                  ? "border-teal/40 bg-teal/15 text-teal-soft"
                  : "border-line text-mist hover:text-white"
              }`}
            >
              {AVAILABILITY_LABELS[s]}
            </button>
          )
        )}
      </div>
      <label className="mt-3 block text-xs text-mist">
        Until (optional)
        <input
          type="datetime-local"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save availability"}
      </button>
      {msg ? <p className="mt-2 text-xs text-teal-soft">{msg}</p> : null}
    </div>
  );
}
