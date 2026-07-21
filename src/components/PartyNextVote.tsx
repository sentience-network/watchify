"use client";

import { useMemo, useState } from "react";
import { freeMovies, getMovie } from "@/lib/movies";
import { getPartyRealtime, type PartyNextVote } from "@/lib/party-realtime";
import { useWatchify } from "@/lib/store";

/**
 * In-party “What next?” vote — watchlist / Free titles → next movieId.
 */
export function PartyNextVote({
  partyId,
  isHostOrCo,
  vote,
  currentUserId,
}: {
  partyId: string;
  isHostOrCo: boolean;
  vote: PartyNextVote | null;
  currentUserId: string;
}) {
  const { state, updateParty } = useWatchify();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const pool = useMemo(() => {
    const ids = new Set<string>();
    for (const w of state.watchlists) {
      for (const id of w.movieIds) ids.add(id);
    }
    for (const m of freeMovies().slice(0, 24)) ids.add(m.id);
    return Array.from(ids)
      .map((id) => getMovie(id))
      .filter(Boolean)
      .slice(0, 40);
  }, [state.watchlists]);

  const tallies = useMemo(() => {
    if (!vote) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const opt of vote.options) map.set(opt.movieId, 0);
    for (const movieId of Object.values(vote.votes)) {
      map.set(movieId, (map.get(movieId) || 0) + 1);
    }
    return map;
  }, [vote]);

  const myVote = vote?.votes[currentUserId];

  function togglePick(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function startVote() {
    setMsg("");
    if (selected.length < 2) {
      setMsg("Pick 2–3 titles.");
      return;
    }
    const options = selected.map((id) => {
      const m = getMovie(id)!;
      return { movieId: id, title: m.title };
    });
    const rt = getPartyRealtime(partyId);
    const ok = await rt?.startNextVote(options);
    if (!ok) {
      setMsg("Could not start vote — check realtime connection.");
      return;
    }
    setPicking(false);
    setSelected([]);
  }

  function cast(movieId: string) {
    getPartyRealtime(partyId)?.castNextVote(movieId);
  }

  async function applyWinner(movieId: string) {
    setBusy(true);
    setMsg("");
    const result = await updateParty(partyId, { movieId });
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    getPartyRealtime(partyId)?.endNextVote();
    setMsg("Title updated for the room.");
  }

  if (!isHostOrCo && !vote) return null;

  return (
    <div className="mt-3 rounded-xl border border-line/70 bg-ink/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
            What next?
          </p>
          <p className="mt-0.5 text-[11px] text-mist/70">
            Vote on the next title from your watchlists or Watchify Free. Does
            not stream paid services.
          </p>
        </div>
        {isHostOrCo && !vote ? (
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            className="rounded-lg border border-teal/40 px-2.5 py-1 text-[11px] font-medium text-teal-soft"
          >
            {picking ? "Cancel" : "Start vote"}
          </button>
        ) : null}
        {isHostOrCo && vote ? (
          <button
            type="button"
            onClick={() => getPartyRealtime(partyId)?.endNextVote()}
            className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-mist"
          >
            End vote
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="mt-2">
          <p className="text-[11px] text-mist/65">Pick 2–3 options</p>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
            {pool.map((m) => {
              if (!m) return null;
              const on = selected.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => togglePick(m.id)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                      on
                        ? "bg-teal/20 text-teal-soft"
                        : "border border-line/60 text-mist hover:text-white"
                    }`}
                  >
                    {m.title} ({m.year})
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => void startVote()}
            className="mt-2 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Open vote ({selected.length}/3)
          </button>
        </div>
      ) : null}

      {vote ? (
        <ul className="mt-2 space-y-1.5">
          {vote.options.map((opt) => {
            const count = tallies.get(opt.movieId) || 0;
            const mine = myVote === opt.movieId;
            return (
              <li
                key={opt.movieId}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => cast(opt.movieId)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${
                    mine
                      ? "bg-teal text-ink"
                      : "border border-line text-mist hover:border-teal/40"
                  }`}
                >
                  {opt.title} · {count} vote{count === 1 ? "" : "s"}
                </button>
                {isHostOrCo ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyWinner(opt.movieId)}
                    className="text-[11px] font-medium text-teal-soft hover:underline disabled:opacity-50"
                  >
                    Set as next
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {msg ? (
        <p className="mt-2 text-[11px] text-mist/80" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
