"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeWatchMatches } from "@/lib/watch-match";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import { MoviePoster } from "./MoviePoster";
import { isFreePlayable } from "@/lib/free-content";
import { parseFriendCircles } from "@/lib/friend-circles";

export function WatchMatchPanel() {
  const { state, ready, currentUserId, directoryUsers, createParty } =
    useWatchify();
  const me = directoryUsers.find((u) => u.id === currentUserId);
  const circles = parseFriendCircles(me?.friendCircles || []);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const friends = useMemo(
    () =>
      state.friendIds
        .map((id) => directoryUsers.find((u) => u.id === id) || getUser(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof getUser>>[],
    [state.friendIds, directoryUsers]
  );

  const matches = useMemo(() => {
    if (!ready || selected.length < 1) return [];
    return computeWatchMatches({
      state,
      friends,
      selectedFriendIds: selected,
    });
  }, [ready, state, friends, selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 6)
    );
  }

  function applyCircle(memberIds: string[]) {
    setSelected(memberIds.filter((id) => state.friendIds.includes(id)).slice(0, 6));
  }

  async function startParty(movieId: string, free: boolean) {
    setBusy(true);
    setError("");
    const result = await createParty({
      name: "Watch Match",
      movieId,
      isLive: true,
      startsAt: null,
      syncMode: free ? "watchify_free" : "own_account",
      serviceId: free ? null : state.linkedServices[0] || null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/parties/${result.value.id}`;
  }

  if (!ready) return <p className="text-mist">Loading matches…</p>;

  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-5">
      <h2 className="font-display text-xl font-semibold text-white">
        Watch Match
      </h2>
      <p className="mt-1 text-sm text-mist/75">
        Pick friends — we suggest titles on overlapping linked services (or
        Watchify Free). Metadata + badges only; everyone still uses their own
        account.
      </p>

      {circles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {circles.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => applyCircle(c.memberIds)}
              className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] text-teal-soft"
            >
              Circle: {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {friends.map((f) => {
          const on = selected.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                on
                  ? "border-teal/40 bg-teal/15 text-teal-soft"
                  : "border-line text-mist"
              }`}
            >
              {f.name}
            </button>
          );
        })}
        {!friends.length ? (
          <p className="text-xs text-mist/60">
            Add friends on{" "}
            <Link href="/feed" className="text-teal-soft underline">
              Feed
            </Link>{" "}
            first.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {matches.map((m) => (
          <li
            key={m.movie.id}
            className="flex gap-3 rounded-xl border border-line bg-ink/35 p-3"
          >
            <MoviePoster movie={m.movie} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-white">
                {m.movie.title}
              </p>
              <p className="text-xs text-mist/70">{m.reason}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void startParty(m.movie.id, m.freePlayable || isFreePlayable(m.movie))
                }
                className="mt-2 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
              >
                Start party
              </button>
            </div>
          </li>
        ))}
        {selected.length > 0 && matches.length === 0 ? (
          <li className="text-xs text-mist/60">
            No overlaps yet — link more services in Settings, or try Watchify Free
            titles.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
