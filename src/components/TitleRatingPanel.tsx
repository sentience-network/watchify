"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type TitleScoreSummary = {
  movieId: string;
  catalogScore: number | null;
  userAverage: number | null;
  userCount: number;
  audiencePercent: number | null;
  myScore: number | null;
};

type Props = {
  movieId: string;
  catalogScore?: number;
  compact?: boolean;
};

/**
 * Film-reel audience meter: blends community 1–10 ratings with catalog/TMDB when present.
 */
export function TitleRatingPanel({ movieId, catalogScore, compact }: Props) {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<TitleScoreSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/ratings?movieId=${encodeURIComponent(movieId)}`
    );
    const data = await res.json();
    if (res.ok && data.summary) setSummary(data.summary);
  }, [movieId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rate(score: number) {
    if (!session?.user) {
      setMsg("Sign in to rate.");
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, score }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not save rating");
      return;
    }
    setSummary(data.summary);
    setMsg("Saved — thanks.");
  }

  const pct =
    summary?.audiencePercent ??
    (catalogScore && catalogScore > 0
      ? Math.round(catalogScore * 10)
      : null);

  if (compact) {
    if (pct == null) return null;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-amber/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-soft"
        title="Audience score (community + catalog blend)"
      >
        <span aria-hidden>🎞</span>
        {pct}%
      </span>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-line bg-panel/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-teal">
            Audience meter
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            {pct != null ? `${pct}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-mist/70">
            Blends Watchify ratings
            {summary?.userCount ? ` (${summary.userCount})` : ""}
            {summary?.catalogScore
              ? ` with catalog ${summary.catalogScore.toFixed(1)}/10`
              : catalogScore
                ? ` with catalog ${catalogScore.toFixed(1)}/10`
                : ""}
            . Not an official Tomatometer.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const active = summary?.myScore === n;
            return (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => void rate(n)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                  active
                    ? "bg-teal text-ink"
                    : "border border-line text-mist hover:border-teal/50 hover:text-white"
                } disabled:opacity-50`}
                aria-label={`Rate ${n} out of 10`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
      {msg ? <p className="mt-2 text-xs text-mist/80">{msg}</p> : null}
    </section>
  );
}
