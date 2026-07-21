"use client";

import { useEffect, useMemo, useState } from "react";
import { CATALOG } from "@/lib/movies";
import {
  NO_CREDENTIAL_COPY,
  STREAMING_HONEST_COPY,
  STREAMING_SERVICES,
  type StreamingServiceId,
} from "@/lib/streaming";
import { useWatchify } from "@/lib/store";

export function ShareFromServicePanel({ compact }: { compact?: boolean }) {
  const { state, setCurrentlyWatching, ready } = useWatchify();
  const [movieId, setMovieId] = useState(
    state.currentlyWatchingId ?? CATALOG[0]?.id ?? "m1"
  );
  const [serviceId, setServiceId] = useState<StreamingServiceId | "">(
    state.currentlyWatchingServiceId ?? state.linkedServices[0] ?? ""
  );
  const [progress, setProgress] = useState(
    state.watchingProgressPercent ?? 0
  );
  const [msg, setMsg] = useState("");

  const linked = useMemo(
    () =>
      STREAMING_SERVICES.filter((s) => state.linkedServices.includes(s.id)),
    [state.linkedServices]
  );

  useEffect(() => {
    if (!serviceId && state.linkedServices[0]) {
      setServiceId(state.linkedServices[0]);
      return;
    }
    if (serviceId && !state.linkedServices.includes(serviceId)) {
      setServiceId(state.linkedServices[0] ?? "");
    }
  }, [serviceId, state.linkedServices]);

  if (!ready) return null;

  function share() {
    if (!serviceId) {
      setMsg("Link a streaming service in Settings first, then pick it here.");
      return;
    }
    if (!state.linkedServices.includes(serviceId)) {
      setMsg("That service isn’t linked yet — connect it in Settings.");
      return;
    }
    setCurrentlyWatching(movieId, {
      serviceId,
      progressPercent: progress,
    });
    setMsg("Shared with friends — they can follow along socially for free.");
  }

  return (
    <section
      className={`rounded-2xl border border-line bg-panel/50 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <h2 className="font-display text-lg font-semibold text-white">
        Share watching from a service
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-mist/80">
        {STREAMING_HONEST_COPY}
      </p>
      {!linked.length ? (
        <p className="mt-3 text-sm text-amber-soft">
          No services linked yet.{" "}
          <a href="/settings" className="underline">
            Connect services in Settings
          </a>
          .
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <select
            value={movieId}
            onChange={(e) => setMovieId(e.target.value)}
            className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          >
            {CATALOG.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.year})
              </option>
            ))}
          </select>
          <select
            value={serviceId}
            onChange={(e) =>
              setServiceId(e.target.value as StreamingServiceId | "")
            }
            className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          >
            <option value="">Select linked service…</option>
            {linked.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="block text-xs text-mist">
            Progress (optional): {progress}%
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <button
            type="button"
            onClick={share}
            className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Share now watching
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-teal-soft">{msg}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-mist/55">
        {NO_CREDENTIAL_COPY}
      </p>
    </section>
  );
}
