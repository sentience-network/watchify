import { isFreePlayable } from "./free-content";
import { getMovie } from "./movies";
import {
  STREAMING_SERVICES,
  isStreamingServiceId,
  type StreamingServiceId,
} from "./streaming";
import type { Movie, User, WatchParty } from "./types";

/** Services tagged on a title (subscription stream offers only). */
export function titleStreamServices(movie: Movie | undefined): StreamingServiceId[] {
  if (!movie?.providers?.length) return [];
  const ids: StreamingServiceId[] = [];
  for (const p of movie.providers) {
    if (p.kind && p.kind !== "stream") continue;
    if (isStreamingServiceId(p.id) && !ids.includes(p.id)) ids.push(p.id);
  }
  return ids;
}

export function serviceLabel(id: StreamingServiceId | string) {
  return STREAMING_SERVICES.find((s) => s.id === id)?.name || id;
}

/**
 * Honest join check: own-account rooms need a linked service (or a Free
 * fallback). Never claims Watchify can stream paid catalogs.
 */
export function partyServiceMismatch(input: {
  party: Pick<WatchParty, "syncMode" | "serviceId" | "movieId">;
  linkedServices: StreamingServiceId[];
  movie?: Movie;
}): {
  mismatch: boolean;
  hostService?: StreamingServiceId | null;
  freeFallback: boolean;
  message: string | null;
} {
  const movie = input.movie || getMovie(input.party.movieId);
  const freeFallback = Boolean(movie && isFreePlayable(movie));
  const mode = input.party.syncMode || "social";

  if (mode === "watchify_free" || mode === "social") {
    return { mismatch: false, freeFallback, message: null };
  }

  const hostService = input.party.serviceId || null;
  if (!hostService) {
    return { mismatch: false, hostService, freeFallback, message: null };
  }

  if (input.linkedServices.includes(hostService)) {
    return { mismatch: false, hostService, freeFallback, message: null };
  }

  const name = serviceLabel(hostService);
  return {
    mismatch: true,
    hostService,
    freeFallback,
    message: freeFallback
      ? `This room prefers ${name}, which you haven’t linked. You can still chat — or switch to the Watchify Free title if the host offers one. Watchify never plays paid streams for you.`
      : `This room prefers ${name}, which you haven’t linked in Settings. You can still join for chat and scrub hints — open the title on your own ${name} account. Watchify never streams paid catalogs.`,
  };
}

/** Friends whose linked services overlap the title (or host service). */
export function whoCanWatchTitle(input: {
  movie?: Movie;
  hostService?: StreamingServiceId | null;
  friends: User[];
  syncMode?: WatchParty["syncMode"];
}): { user: User; via: StreamingServiceId[] }[] {
  const movie = input.movie;
  const free = movie && isFreePlayable(movie);
  if (input.syncMode === "watchify_free" || free) {
    return input.friends.map((user) => ({ user, via: [] as StreamingServiceId[] }));
  }

  const needed = new Set<StreamingServiceId>();
  if (input.hostService) needed.add(input.hostService);
  for (const id of titleStreamServices(movie)) needed.add(id);

  if (needed.size === 0) {
    return input.friends.map((user) => ({ user, via: [] as StreamingServiceId[] }));
  }

  const out: { user: User; via: StreamingServiceId[] }[] = [];
  for (const user of input.friends) {
    const linked = user.linkedServices || [];
    const via = linked.filter((id) => needed.has(id));
    if (via.length) out.push({ user, via });
  }
  return out;
}
