import {
  availabilityIsActive,
  type PartyAvailability,
} from "@/lib/party-availability";
import { isFreePlayable } from "@/lib/free-content";
import { getMovie } from "@/lib/movies";
import { serviceOverlap } from "@/lib/social-graph";
import { titleStreamServices } from "@/lib/service-access";
import type { AppState, Movie, User, WatchParty } from "@/lib/types";
import type { StreamingServiceId } from "@/lib/streaming";

export type TonightFriendRow = {
  userId: string;
  name: string;
  availability: PartyAvailability | null;
  onlineWatchingId: string | null;
  rsvpPartyIds: string[];
  linkedServices: StreamingServiceId[];
};

export type TonightTitleHit = {
  movie: Movie;
  friendIds: string[];
  overlapServices: StreamingServiceId[];
  freeFallback: boolean;
  whoFree: string[];
  whoOnline: string[];
  whoRsvpd: string[];
  answer: string;
  score: number;
};

/**
 * “Can we watch this tonight?” — overlap Link badges + Free tonight / online / RSVP + Free title fallback.
 */
export function computeTonightAvailability(input: {
  state: AppState;
  me: User | undefined;
  friends: User[];
  openParties: WatchParty[];
  publicWatching: { userId: string; movieId: string }[];
  limit?: number;
}): { friends: TonightFriendRow[]; titles: TonightTitleHit[] } {
  const friendRows: TonightFriendRow[] = input.friends.map((f) => {
    const avail = f.partyAvailability || null;
    const active =
      avail && availabilityIsActive(avail) ? avail : null;
    const watching = input.publicWatching.find((w) => w.userId === f.id);
    const rsvpPartyIds = input.openParties
      .filter(
        (p) =>
          p.memberIds.includes(f.id) ||
          p.hostId === f.id ||
          Boolean(p.coHostIds?.includes(f.id))
      )
      .map((p) => p.id);
    return {
      userId: f.id,
      name: f.name,
      availability: active,
      onlineWatchingId: watching?.movieId || f.currentlyWatchingId || null,
      rsvpPartyIds,
      linkedServices: f.linkedServices || [],
    };
  });

  const freeTonight = friendRows.filter((r) => r.availability?.status === "free");
  const online = friendRows.filter((r) => Boolean(r.onlineWatchingId));
  const rsvpd = friendRows.filter((r) => r.rsvpPartyIds.length > 0);

  const myServices = input.state.linkedServices;
  const candidateIds = new Set<string>();
  for (const f of input.friends) {
    if (f.currentlyWatchingId) candidateIds.add(f.currentlyWatchingId);
    for (const id of f.recentlyWatchedIds || []) candidateIds.add(id);
    for (const id of f.favoriteMovieIds || []) candidateIds.add(id);
  }
  for (const a of input.state.activities) {
    if (input.friends.some((f) => f.id === a.userId)) {
      candidateIds.add(a.movieId);
    }
  }
  if (input.state.currentlyWatchingId) {
    candidateIds.add(input.state.currentlyWatchingId);
  }

  const titles: TonightTitleHit[] = [];
  for (const movieId of Array.from(candidateIds)) {
    const movie = getMovie(movieId);
    if (!movie) continue;
    const freeFallback = isFreePlayable(movie);
    const titleServices = titleStreamServices(movie);
    const able: string[] = [];
    const overlapAcc = new Set<StreamingServiceId>();

    for (const f of input.friends) {
      const their = f.linkedServices || [];
      if (freeFallback) {
        able.push(f.id);
        continue;
      }
      const overlap = serviceOverlap(
        myServices.length ? myServices : titleServices,
        their
      );
      const usable = overlap.filter(
        (s) => !titleServices.length || titleServices.includes(s)
      );
      if (usable.length || overlap.length) {
        able.push(f.id);
        for (const s of usable.length ? usable : overlap) overlapAcc.add(s);
      }
    }

    if (!able.length && !freeFallback) continue;

    const whoFree = freeTonight
      .filter((r) => able.includes(r.userId) || freeFallback)
      .map((r) => r.userId);
    const whoOnline = online
      .filter((r) => able.includes(r.userId) || r.onlineWatchingId === movieId)
      .map((r) => r.userId);
    const whoRsvpd = rsvpd
      .filter((r) => able.includes(r.userId))
      .map((r) => r.userId);

    const parts: string[] = [];
    if (overlapAcc.size) {
      parts.push(`overlap on ${Array.from(overlapAcc).slice(0, 3).join(", ")}`);
    } else if (freeFallback) {
      parts.push("Watchify Free (no shared paid service needed)");
    }
    if (whoFree.length) parts.push(`${whoFree.length} free tonight`);
    if (whoOnline.length) parts.push(`${whoOnline.length} online now`);
    if (whoRsvpd.length) parts.push(`${whoRsvpd.length} already RSVP’d`);
    if (!parts.length) parts.push("possible with current badges");

    const score =
      able.length * 3 +
      whoFree.length * 4 +
      whoOnline.length * 2 +
      whoRsvpd.length * 2 +
      (freeFallback ? 2 : overlapAcc.size * 2);

    titles.push({
      movie,
      friendIds: able,
      overlapServices: Array.from(overlapAcc),
      freeFallback,
      whoFree,
      whoOnline,
      whoRsvpd,
      answer: `Yes — ${parts.join(" · ")}`,
      score,
    });
  }

  titles.sort((a, b) => b.score - a.score);
  return {
    friends: friendRows,
    titles: titles.slice(0, input.limit ?? 8),
  };
}
