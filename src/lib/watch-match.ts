import { getMovie } from "./movies";
import { serviceOverlap } from "./social-graph";
import { titleStreamServices } from "./service-access";
import { isFreePlayable } from "./free-content";
import type { AppState, Movie, User } from "./types";
import type { StreamingServiceId } from "./streaming";

export type WatchMatchHit = {
  movie: Movie;
  friendIds: string[];
  overlapServices: StreamingServiceId[];
  freePlayable: boolean;
  score: number;
  reason: string;
};

/**
 * Titles friends could watch together on overlapping services (or Free),
 * that the current user hasn't finished recently.
 */
export function computeWatchMatches(input: {
  state: AppState;
  friends: User[];
  selectedFriendIds: string[];
  catalog?: Movie[];
  limit?: number;
}): WatchMatchHit[] {
  const selected = input.friends.filter((f) =>
    input.selectedFriendIds.includes(f.id)
  );
  if (!selected.length) return [];

  const mine = new Set([
    ...input.state.recentlyWatchedIds,
    ...(input.state.currentlyWatchingId
      ? [input.state.currentlyWatchingId]
      : []),
  ]);

  const myServices = input.state.linkedServices;
  const scores = new Map<string, WatchMatchHit>();

  // Seed from friend activity + recently watched
  const candidateIds = new Set<string>();
  for (const a of input.state.activities) {
    if (!input.selectedFriendIds.includes(a.userId)) continue;
    if (a.type === "finished" || a.type === "watching" || a.type === "watchlist_add") {
      candidateIds.add(a.movieId);
    }
  }
  for (const f of selected) {
    for (const id of f.recentlyWatchedIds || []) candidateIds.add(id);
    if (f.currentlyWatchingId) candidateIds.add(f.currentlyWatchingId);
    for (const id of f.favoriteMovieIds || []) candidateIds.add(id);
  }
  if (input.catalog) {
    for (const m of input.catalog.slice(0, 80)) candidateIds.add(m.id);
  }

  for (const movieId of Array.from(candidateIds)) {
    if (mine.has(movieId)) continue;
    const movie = getMovie(movieId) || input.catalog?.find((m) => m.id === movieId);
    if (!movie) continue;

    const freePlayable = isFreePlayable(movie);
    const titleServices = titleStreamServices(movie);
    const friendHits: string[] = [];
    const overlapAcc = new Set<StreamingServiceId>();

    for (const f of selected) {
      const their = f.linkedServices || [];
      if (freePlayable) {
        friendHits.push(f.id);
        continue;
      }
      const overlap = serviceOverlap(
        myServices.length ? myServices : titleServices,
        their
      );
      const usable =
        overlap.length > 0
          ? overlap.filter(
              (s) => !titleServices.length || titleServices.includes(s)
            )
          : serviceOverlap(titleServices, their);
      if (usable.length || (titleServices.length === 0 && overlap.length)) {
        friendHits.push(f.id);
        for (const s of usable.length ? usable : overlap) overlapAcc.add(s);
      }
    }

    if (friendHits.length < Math.min(2, selected.length) && !freePlayable) {
      // Need most selected friends able to watch
      if (friendHits.length === 0) continue;
    }
    if (friendHits.length === 0) continue;

    const score =
      (freePlayable ? 4 : overlapAcc.size * 2) +
      friendHits.length * 3 +
      (movie.rating || 0) / 10;

    const names = selected
      .filter((f) => friendHits.includes(f.id))
      .map((f) => f.name.split(" ")[0])
      .slice(0, 3)
      .join(", ");

    const reason = freePlayable
      ? `Watchify Free — syncable with ${names}`
      : overlapAcc.size
        ? `Overlap on ${Array.from(overlapAcc)
            .slice(0, 2)
            .join(", ")} · ${names}`
        : `Friends may have this · ${names}`;

    const prev = scores.get(movie.id);
    if (!prev || score > prev.score) {
      scores.set(movie.id, {
        movie,
        friendIds: friendHits,
        overlapServices: Array.from(overlapAcc),
        freePlayable,
        score,
        reason,
      });
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 12);
}
