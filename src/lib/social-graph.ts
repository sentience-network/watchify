import { getMovie } from "./movies";
import type { Activity, AppState, User } from "./types";
import type { StreamingServiceId } from "./streaming";
import { allUsers, getUser } from "./users";

export type FriendRec = {
  movieId: string;
  reason: string;
  fromUserId: string;
  score: number;
};

/** Simple taste graph: rank titles friends finished/watched that you haven't. */
export function recommendationsFromFriends(
  state: AppState,
  currentUserId?: string
): FriendRec[] {
  const meId = currentUserId || state.currentUserId;
  const mine = new Set([
    ...state.recentlyWatchedIds,
    ...(state.currentlyWatchingId ? [state.currentlyWatchingId] : []),
    ...state.watchlists
      .filter((w) => w.ownerId === meId)
      .flatMap((w) => w.movieIds),
  ]);
  const scores = new Map<string, FriendRec>();

  for (const a of state.activities) {
    if (!state.friendIds.includes(a.userId)) continue;
    if (mine.has(a.movieId)) continue;
    if (!getMovie(a.movieId)) continue;
    const friend = getUser(a.userId);
    if (!friend) continue;
    const weight =
      a.type === "finished" ? 3 : a.type === "watching" ? 2 : a.type === "watchlist_add" ? 1 : 0;
    if (!weight) continue;
    const prev = scores.get(a.movieId);
    const reason =
      a.type === "finished"
        ? `Because ${friend.name.split(" ")[0]} finished it`
        : a.type === "watching"
          ? `${friend.name.split(" ")[0]} is watching this now`
          : `${friend.name.split(" ")[0]} queued this`;
    if (!prev || weight > prev.score) {
      scores.set(a.movieId, {
        movieId: a.movieId,
        reason,
        fromUserId: a.userId,
        score: weight + (prev?.score || 0),
      });
    } else {
      prev.score += weight;
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export function serviceOverlap(
  myServices: StreamingServiceId[],
  theirServices: StreamingServiceId[] | undefined
): StreamingServiceId[] {
  if (!theirServices?.length) return [];
  const set = new Set(myServices);
  return theirServices.filter((s) => set.has(s));
}

export function compatibleFriends(
  state: AppState,
  directory?: User[],
  currentUserId?: string
): { user: User; overlap: StreamingServiceId[] }[] {
  const meId = currentUserId || state.currentUserId;
  const pool = directory?.length ? directory : allUsers();
  const me = pool.find((u) => u.id === meId) || getUser(meId);
  const myServices = state.linkedServices.length
    ? state.linkedServices
    : me?.linkedServices || [];
  return pool
    .filter((u) => u.id !== meId && !state.blockedUserIds.includes(u.id))
    .map((user) => ({
      user,
      overlap: serviceOverlap(myServices, user.linkedServices),
    }))
    .filter((r) => r.overlap.length > 0 || state.friendIds.includes(r.user.id))
    .sort((a, b) => {
      const af = state.friendIds.includes(a.user.id) ? 1 : 0;
      const bf = state.friendIds.includes(b.user.id) ? 1 : 0;
      if (bf !== af) return bf - af;
      return b.overlap.length - a.overlap.length;
    })
    .slice(0, 8);
}

export function liveFriendCount(
  state: AppState,
  directory?: User[]
): number {
  const pool = directory?.length ? directory : allUsers();
  return pool.filter(
    (u) =>
      state.friendIds.includes(u.id) &&
      u.currentlyWatchingId &&
      !state.blockedUserIds.includes(u.id)
  ).length;
}

/** Invite link — public preview + OG at /share/party (prefer inviteCode). */
export function partyInviteUrl(
  partyIdOrCode: string,
  origin?: string,
  opts?: { inviteCode?: string }
): string {
  const code = opts?.inviteCode || partyIdOrCode;
  const path = `/share/party/${encodeURIComponent(code)}`;
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}${path}`;
  return path;
}

/** Count of recent watching activities for FOMO strip */
export function recentWatchingPulse(activities: Activity[]): number {
  const cutoff = Date.now() - 1000 * 60 * 60 * 36;
  return activities.filter(
    (a) =>
      a.type === "watching" && new Date(a.createdAt).getTime() > cutoff
  ).length;
}
