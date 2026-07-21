import type {
  Activity,
  FriendRequest,
  PartyJoinRequest,
  PartyMessage,
  PartyReaction,
  User,
  Watchlist,
  WatchParty,
} from "./types";

/** Demo Alex id — prefer `useWatchify().currentUserId` / session in the UI. */
export const CURRENT_USER_ID = "u1";

/** Default friends for the signed-in demo user (seeded into DB). */
export const SEED_FRIEND_IDS = ["u2", "u3", "u4", "u5"];

export const USERS: User[] = [
  {
    id: "u1",
    name: "Alex Rivera",
    handle: "alexr",
    bio: "Night owl. Sci-fi first, prestige drama second. Building watchlists like playlists.",
    avatarHue: 168,
    currentlyWatchingId: "m1",
    currentlyWatchingServiceId: "max",
    watchingProgressPercent: 42,
    recentlyWatchedIds: ["m3", "m9", "m18"],
    friendIds: ["u2", "u3", "u4", "u5"],
    linkedServices: ["max", "netflix"],
  },
  {
    id: "u2",
    name: "Jordan Lee",
    handle: "jlee",
    bio: "Horror weekends and Criterion rabbit holes.",
    avatarHue: 28,
    currentlyWatchingId: "m7",
    currentlyWatchingServiceId: "hulu",
    watchingProgressPercent: 67,
    recentlyWatchedIds: ["m13", "m31"],
    friendIds: ["u1", "u3"],
    linkedServices: ["hulu", "max", "peacock"],
  },
  {
    id: "u3",
    name: "Sam Okonkwo",
    handle: "samok",
    bio: "If it has a score by Hans Zimmer, I'm in.",
    avatarHue: 210,
    currentlyWatchingId: "m10",
    currentlyWatchingServiceId: "prime",
    watchingProgressPercent: 18,
    recentlyWatchedIds: ["m2", "m22"],
    friendIds: ["u1", "u2", "u4"],
    linkedServices: ["prime", "apple"],
  },
  {
    id: "u4",
    name: "Casey Nguyen",
    handle: "caseyfilm",
    bio: "Indie romance, messy feelings, perfect endings optional.",
    avatarHue: 320,
    currentlyWatchingId: "m6",
    currentlyWatchingServiceId: "netflix",
    watchingProgressPercent: 55,
    recentlyWatchedIds: ["m14", "m32"],
    friendIds: ["u1", "u3", "u5"],
    linkedServices: ["netflix", "disney"],
  },
  {
    id: "u5",
    name: "Riley Brooks",
    handle: "rileyb",
    bio: "Blockbusters with friends. Deep cuts alone.",
    avatarHue: 48,
    currentlyWatchingId: "m5",
    currentlyWatchingServiceId: "disney",
    watchingProgressPercent: 30,
    recentlyWatchedIds: ["m8", "m27"],
    friendIds: ["u1", "u4"],
    linkedServices: ["disney", "paramount", "prime"],
  },
  {
    id: "u6",
    name: "Morgan Ellis",
    handle: "mellis",
    bio: "New in town — looking for watch-party buddies and midnight premieres.",
    avatarHue: 125,
    currentlyWatchingId: "m12",
    currentlyWatchingServiceId: "netflix",
    watchingProgressPercent: 12,
    recentlyWatchedIds: ["m4", "m20"],
    friendIds: [],
    linkedServices: ["netflix"],
  },
  {
    id: "u7",
    name: "Quinn Park",
    handle: "qpark",
    bio: "Documentary nerd. Always hosting open parties for the curious.",
    avatarHue: 265,
    currentlyWatchingId: "m15",
    currentlyWatchingServiceId: "max",
    watchingProgressPercent: 80,
    recentlyWatchedIds: ["m21", "m25"],
    friendIds: ["u6"],
    linkedServices: ["max", "peacock", "paramount"],
  },
];

export function getUser(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}

export function allUsers(): User[] {
  return USERS;
}

/** Prefer live directory (testers + real accounts), then demo seed, then id. */
export function resolveDirectoryUser(
  id: string,
  directoryUsers: readonly User[] = []
): User | undefined {
  return directoryUsers.find((u) => u.id === id) || getUser(id);
}

export type PartyUserLabel = {
  name: string;
  handle: string;
  /** "Name (@handle)" when handle known, else name */
  label: string;
};

/**
 * Display name for party chat / video roster.
 * Never silent "Someone" when we have a userId — fall back to truncated id.
 */
export function partyUserLabel(
  id: string,
  directoryUsers: readonly User[] = [],
  hint?: { name?: string | null; handle?: string | null }
): PartyUserLabel {
  const user = resolveDirectoryUser(id, directoryUsers);
  const name =
    (user?.name?.trim() || hint?.name?.trim() || "").trim() ||
    (id.length > 10 ? `${id.slice(0, 8)}…` : id || "Member");
  const handle = (user?.handle?.trim() || hint?.handle?.trim() || "").replace(
    /^@/,
    ""
  );
  return {
    name,
    handle,
    label: handle ? `${name} (@${handle})` : name,
  };
}

export const SEED_WATCHLISTS: Watchlist[] = [
  {
    id: "wl1",
    name: "Mind-benders",
    description: "Films that rearrange your furniture.",
    movieIds: ["m22", "m3", "m16", "m19", "m10"],
    isPublic: true,
    ownerId: "u1",
    createdAt: "2026-06-01T18:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
  },
  {
    id: "wl2",
    name: "Sunday comfort",
    description: "Soft light, big feelings, no homework.",
    movieIds: ["m14", "m15", "m23", "m6"],
    isPublic: true,
    ownerId: "u1",
    createdAt: "2026-06-12T20:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
  },
  {
    id: "wl3",
    name: "Private queue",
    description: "Still deciding if these leave the vault.",
    movieIds: ["m26", "m29", "m30"],
    isPublic: false,
    ownerId: "u1",
    createdAt: "2026-07-01T11:00:00.000Z",
    updatedAt: "2026-07-14T16:00:00.000Z",
  },
  {
    id: "wl4",
    name: "Scary good",
    description: "Jordan's curated chillers.",
    movieIds: ["m7", "m13", "m31"],
    isPublic: true,
    ownerId: "u2",
    createdAt: "2026-05-20T18:00:00.000Z",
    updatedAt: "2026-07-11T22:00:00.000Z",
  },
  {
    id: "wl5",
    name: "Score first",
    description: "Sam's sonic cinema.",
    movieIds: ["m2", "m10", "m11", "m22"],
    isPublic: true,
    ownerId: "u3",
    createdAt: "2026-06-05T14:00:00.000Z",
    updatedAt: "2026-07-09T19:00:00.000Z",
  },
];

export const SEED_ACTIVITIES: Activity[] = [
  {
    id: "a1",
    userId: "u2",
    type: "watching",
    movieId: "m7",
    serviceId: "hulu",
    progressPercent: 67,
    createdAt: "2026-07-16T14:20:00.000Z",
  },
  {
    id: "a2",
    userId: "u3",
    type: "finished",
    movieId: "m2",
    serviceId: "prime",
    createdAt: "2026-07-16T12:05:00.000Z",
  },
  {
    id: "a3",
    userId: "u4",
    type: "watchlist_add",
    movieId: "m32",
    watchlistId: "wl2",
    createdAt: "2026-07-16T10:40:00.000Z",
  },
  {
    id: "a4",
    userId: "u5",
    type: "watching",
    movieId: "m5",
    serviceId: "disney",
    progressPercent: 30,
    createdAt: "2026-07-15T23:10:00.000Z",
  },
  {
    id: "a5",
    userId: "u3",
    type: "watchlist_add",
    movieId: "m11",
    watchlistId: "wl5",
    createdAt: "2026-07-15T21:00:00.000Z",
  },
  {
    id: "a6",
    userId: "u2",
    type: "finished",
    movieId: "m13",
    serviceId: "hulu",
    createdAt: "2026-07-15T18:30:00.000Z",
  },
  {
    id: "a7",
    userId: "u4",
    type: "watching",
    movieId: "m6",
    serviceId: "netflix",
    progressPercent: 55,
    createdAt: "2026-07-15T16:00:00.000Z",
  },
  {
    id: "a8",
    userId: "u5",
    type: "finished",
    movieId: "m8",
    serviceId: "disney",
    createdAt: "2026-07-14T22:45:00.000Z",
  },
  {
    id: "a9",
    userId: "u1",
    type: "watching",
    movieId: "m1",
    serviceId: "max",
    progressPercent: 42,
    createdAt: "2026-07-14T20:00:00.000Z",
  },
  {
    id: "a10",
    userId: "u1",
    type: "watchlist_add",
    movieId: "m19",
    watchlistId: "wl1",
    createdAt: "2026-07-14T15:00:00.000Z",
  },
  {
    id: "a11",
    userId: "u6",
    type: "watching",
    movieId: "m12",
    serviceId: "netflix",
    progressPercent: 12,
    createdAt: "2026-07-16T15:00:00.000Z",
  },
  {
    id: "a12",
    userId: "u7",
    type: "party_created",
    movieId: "m15",
    partyId: "wp3",
    serviceId: "max",
    createdAt: "2026-07-16T13:30:00.000Z",
  },
  {
    id: "a13",
    userId: "u2",
    type: "party_created",
    movieId: "m7",
    partyId: "wp1",
    serviceId: "hulu",
    createdAt: "2026-07-16T11:00:00.000Z",
  },
];

export const SEED_PARTIES: WatchParty[] = [
  {
    id: "wp1",
    name: "Horror Friday live",
    hostId: "u2",
    movieId: "m7",
    startsAt: null,
    isLive: true,
    memberIds: ["u2", "u3"],
    status: "open",
    createdAt: "2026-07-16T11:00:00.000Z",
    serviceId: "hulu",
    syncMode: "own_account",
  },
  {
    id: "wp2",
    name: "Score night with Sam",
    hostId: "u3",
    movieId: "m10",
    startsAt: "2026-07-16T22:00:00.000Z",
    isLive: false,
    memberIds: ["u3", "u1"],
    status: "open",
    createdAt: "2026-07-15T19:00:00.000Z",
    serviceId: "prime",
    syncMode: "own_account",
  },
  {
    id: "wp3",
    name: "Open doc hangout",
    hostId: "u7",
    movieId: "m15",
    startsAt: null,
    isLive: true,
    memberIds: ["u7"],
    status: "open",
    createdAt: "2026-07-16T13:30:00.000Z",
    serviceId: "max",
    syncMode: "social",
  },
  {
    id: "wp4",
    name: "Alex's dune den",
    hostId: "u1",
    movieId: "m1",
    startsAt: "2026-07-17T20:00:00.000Z",
    isLive: false,
    memberIds: ["u1"],
    status: "open",
    createdAt: "2026-07-16T09:00:00.000Z",
    serviceId: "max",
    syncMode: "social",
  },
  {
    id: "wp5",
    name: "Free Bunny party",
    hostId: "u5",
    movieId: "free1",
    startsAt: null,
    isLive: true,
    memberIds: ["u5", "u4"],
    status: "open",
    createdAt: "2026-07-16T16:00:00.000Z",
    syncMode: "watchify_free",
  },
];

export const SEED_PARTY_MESSAGES: PartyMessage[] = [
  {
    id: "pm1",
    partyId: "wp1",
    userId: "u2",
    text: "Starting in 2 — grab popcorn. Chat is free even if you're not on Hulu!",
    createdAt: "2026-07-16T14:10:00.000Z",
  },
  {
    id: "pm2",
    partyId: "wp1",
    userId: "u3",
    text: "I'm in on Prime for something else tonight but following here 👀",
    createdAt: "2026-07-16T14:12:00.000Z",
  },
];

export const SEED_PARTY_REACTIONS: PartyReaction[] = [
  {
    id: "pr1",
    partyId: "wp1",
    userId: "u3",
    emoji: "😱",
    createdAt: "2026-07-16T14:15:00.000Z",
  },
  {
    id: "pr2",
    partyId: "wp1",
    userId: "u2",
    emoji: "🔥",
    createdAt: "2026-07-16T14:16:00.000Z",
  },
];

export const SEED_PARTY_JOIN_REQUESTS: PartyJoinRequest[] = [
  {
    id: "pjr1",
    partyId: "wp4",
    fromUserId: "u6",
    status: "pending",
    createdAt: "2026-07-16T14:00:00.000Z",
  },
  {
    id: "pjr2",
    partyId: "wp1",
    fromUserId: "u1",
    status: "pending",
    createdAt: "2026-07-16T14:45:00.000Z",
  },
];

export const SEED_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: "fr1",
    fromUserId: "u6",
    toUserId: "u1",
    status: "pending",
    createdAt: "2026-07-16T12:30:00.000Z",
  },
  {
    id: "fr2",
    fromUserId: "u1",
    toUserId: "u7",
    status: "pending",
    createdAt: "2026-07-16T10:15:00.000Z",
  },
];
