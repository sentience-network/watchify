"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoviePoster } from "@/components/MoviePoster";
import { computeTonightAvailability } from "@/lib/tonight-availability";
import { AVAILABILITY_LABELS } from "@/lib/party-availability";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

/**
 * “Can we watch this tonight?” — Link badge overlap + Free tonight / online / RSVP + Free fallback.
 */
export function TonightAvailabilityPanel() {
  const {
    state,
    ready,
    currentUserId,
    directoryUsers,
    openParties,
    publicWatching,
    createParty,
  } = useWatchify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const friends = useMemo(
    () =>
      state.friendIds
        .map((id) => directoryUsers.find((u) => u.id === id) || getUser(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof getUser>>[],
    [state.friendIds, directoryUsers]
  );

  const me = directoryUsers.find((u) => u.id === currentUserId);
  const graph = useMemo(() => {
    if (!ready || !friends.length) return null;
    return computeTonightAvailability({
      state,
      me,
      friends,
      openParties,
      publicWatching,
      limit: 6,
    });
  }, [ready, state, me, friends, openParties, publicWatching]);

  async function host(movieId: string, free: boolean) {
    setBusyId(movieId);
    setError("");
    const result = await createParty({
      name: "Tonight?",
      movieId,
      isLive: true,
      startsAt: null,
      syncMode: free ? "watchify_free" : "own_account",
      serviceId: free ? null : state.linkedServices[0] || null,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/parties/${result.value.id}`;
  }

  if (!ready) return <p className="text-mist">Loading tonight’s graph…</p>;
  if (!friends.length) {
    return (
      <div className="rounded-2xl border border-line bg-panel/40 p-5">
        <h2 className="font-display text-xl font-semibold text-white">
          Can we watch this tonight?
        </h2>
        <p className="mt-2 text-sm text-mist/75">
          Add friends first — we answer with overlapping Link badges, who&apos;s
          Free tonight / online / RSVP&apos;d, and Watchify Free as a fallback.
        </p>
        <Link
          href="/discover"
          className="mt-3 inline-block text-sm text-teal-soft underline"
        >
          Find friends on Discover →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-5">
      <h2 className="font-display text-xl font-semibold text-white">
        Can we watch this tonight?
      </h2>
      <p className="mt-1 text-sm text-mist/75">
        Auto-answer from Link badges + Free tonight / online / RSVP — Free titles
        work when services don&apos;t overlap. Everyone still uses their own
        account.
      </p>

      {graph && graph.friends.some((f) => f.availability) ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {graph.friends
            .filter((f) => f.availability)
            .slice(0, 8)
            .map((f) => (
              <li
                key={f.userId}
                className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mist"
              >
                <span className="text-white">{f.name}</span> ·{" "}
                {f.availability
                  ? AVAILABILITY_LABELS[f.availability.status]
                  : "—"}
                {f.onlineWatchingId ? " · online" : ""}
                {f.rsvpPartyIds.length ? " · RSVP’d" : ""}
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-mist/60">
          Friends haven&apos;t set Free tonight yet — use Settings → availability,
          or rely on Link badge overlap below.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {(graph?.titles || []).map((hit) => (
          <li
            key={hit.movie.id}
            className="flex gap-3 rounded-xl border border-line/70 bg-ink/30 p-3"
          >
            <div className="w-14 shrink-0">
              <MoviePoster movie={hit.movie} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{hit.movie.title}</p>
              <p className="mt-1 text-xs text-teal-soft">{hit.answer}</p>
              <button
                type="button"
                disabled={busyId === hit.movie.id}
                onClick={() => void host(hit.movie.id, hit.freeFallback)}
                className="mt-2 rounded-lg bg-teal/20 px-3 py-1.5 text-[11px] font-semibold text-teal-soft disabled:opacity-50"
              >
                {busyId === hit.movie.id ? "Starting…" : "Host tonight"}
              </button>
            </div>
          </li>
        ))}
        {!graph?.titles.length ? (
          <li className="text-xs text-mist/65">
            No clear overlap yet — link services in Settings, set Free tonight, or
            pick a Watchify Free title from the library.
          </li>
        ) : null}
      </ul>
      {error ? (
        <p className="mt-2 text-sm text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
