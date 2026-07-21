import { prisma } from "../db";
import type { PlanId } from "../plans";
import { getPlan } from "../plans";
import {
  effectiveCanHostParties,
  syncUserPlanEntitlements,
} from "./plan-entitlements";
import { sanitizeText } from "../sanitize";
import type { StreamingServiceId } from "../streaming";
import { isStreamingServiceId } from "../streaming";
import type {
  Activity,
  ActivityType,
  AppState,
  FriendRequest,
  PartyJoinRequest,
  PartyMessage,
  PartyPlaybackSync,
  PartyReaction,
  RequestStatus,
  SocialLinks,
  User,
  Watchlist,
  WatchParty,
} from "../types";
import {
  BORDER_STYLES,
  PROFILE_THEMES,
  dicebearAvatar,
  dicebearUrlForStyle,
  normalizeAccentPalette,
  normalizeAvatarFrame,
  normalizeAvatarStyle,
  normalizeBannerStyle,
  normalizeBorderStyle,
  normalizeNameplateStyle,
  normalizePatternOverlay,
  normalizeProfileTheme,
  paletteHex,
  planAllowsTier,
  profileLooksFromRow,
  sanitizeAvatarUrl,
  sanitizeHexColor,
  sanitizeProfileBadgeIds,
  ACCENT_PALETTES,
  AVATAR_FRAMES,
  AVATAR_STYLES,
  BANNER_STYLES,
  NAMEPLATE_STYLES,
  PATTERN_OVERLAYS,
} from "../profile-themes";
import { EMPTY_SOCIAL_LINKS, type FavoritePerson } from "../types";
import { parsePartyAvailability } from "../party-availability";
import { parseFriendCircles } from "../friend-circles";

function parseFavoritePeople(json: string | null | undefined): FavoritePerson[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (p): p is FavoritePerson =>
          p &&
          typeof p.id === "number" &&
          typeof p.name === "string" &&
          (p.department === "Acting" ||
            p.department === "Directing" ||
            p.department === "Other")
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function mapPublicUser(row: {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarHue: number;
  avatarUrl?: string | null;
  profileTheme?: string | null;
  borderStyle?: string | null;
  accentColor?: string | null;
  accentPalette?: string | null;
  avatarStyle?: string | null;
  avatarFrame?: string | null;
  bannerStyle?: string | null;
  patternOverlay?: string | null;
  nameplateStyle?: string | null;
  profileBadgeIdsJson?: string | null;
  favoriteMovieIdsJson?: string | null;
  favoritePeopleJson?: string | null;
  currentlyWatchingId: string | null;
  currentlyWatchingServiceId: string | null;
  watchingProgressPercent: number | null;
  watchingStartedAt?: Date | null;
  recentlyWatchedIdsJson: string;
  linkedServicesJson: string;
  socialLinksJson: string;
  publicWatching: boolean;
  partyAvailabilityJson?: string | null;
  friendCirclesJson?: string | null;
}): User {
  const looks = profileLooksFromRow(row);
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    avatarHue: looks.avatarHue,
    avatarUrl: looks.avatarUrl,
    profileTheme: looks.profileTheme,
    borderStyle: looks.borderStyle,
    accentColor: looks.accentColor,
    accentPalette: looks.accentPalette,
    avatarStyle: looks.avatarStyle,
    avatarFrame: looks.avatarFrame,
    bannerStyle: looks.bannerStyle,
    patternOverlay: looks.patternOverlay,
    nameplateStyle: looks.nameplateStyle,
    profileBadgeIds: looks.profileBadgeIds,
    favoriteMovieIds: looks.favoriteMovieIds,
    favoritePeople: parseFavoritePeople(row.favoritePeopleJson),
    currentlyWatchingId: row.publicWatching ? row.currentlyWatchingId : null,
    currentlyWatchingServiceId: row.publicWatching
      ? (row.currentlyWatchingServiceId as StreamingServiceId | null)
      : null,
    watchingProgressPercent: row.publicWatching
      ? row.watchingProgressPercent
      : null,
    watchingStartedAt: row.publicWatching
      ? row.watchingStartedAt?.toISOString() ?? null
      : null,
    recentlyWatchedIds: parseJson<string[]>(row.recentlyWatchedIdsJson, []),
    friendIds: [],
    linkedServices: parseJson<StreamingServiceId[]>(row.linkedServicesJson, []).filter(
      isStreamingServiceId
    ),
    socialLinks: {
      ...EMPTY_SOCIAL_LINKS,
      ...parseJson<Partial<SocialLinks>>(row.socialLinksJson, {}),
    },
    partyAvailability: parsePartyAvailability(
      parseJson(row.partyAvailabilityJson || "{}", {})
    ),
    friendCircles: parseFriendCircles(
      parseJson(row.friendCirclesJson || "[]", [])
    ),
  };
}

async function friendIdsFor(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  return rows.map((r) => r.friendId);
}

async function blockedIdsFor(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return rows.map((r) => r.blockedId);
}

function mapWatchlist(row: {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  items: { movieId: string }[];
}): Watchlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    movieIds: row.items.map((i) => i.movieId),
    isPublic: row.isPublic,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapParty(row: {
  id: string;
  name: string;
  hostId: string;
  movieId: string;
  startsAt: Date | null;
  isLive: boolean;
  status: string;
  createdAt: Date;
  serviceId: string | null;
  syncMode: string;
  coHostIdsJson: string;
  recurringWeekly: boolean;
  clubParentId?: string | null;
  hostClubStreak?: number;
  inviteCode?: string;
  inviteExpiresAt?: Date | null;
  inviteRevokedAt?: Date | null;
  visibility?: string;
  maxMembers?: number;
  members: { userId: string }[];
}): WatchParty {
  return {
    id: row.id,
    name: row.name,
    hostId: row.hostId,
    movieId: row.movieId,
    startsAt: row.startsAt?.toISOString() ?? null,
    isLive: row.isLive,
    memberIds: row.members.map((m) => m.userId),
    status: row.status as WatchParty["status"],
    createdAt: row.createdAt.toISOString(),
    serviceId: row.serviceId as StreamingServiceId | null,
    syncMode: row.syncMode as WatchParty["syncMode"],
    coHostIds: parseJson<string[]>(row.coHostIdsJson, []),
    recurringWeekly: row.recurringWeekly,
    clubParentId: row.clubParentId || null,
    hostClubStreak: row.hostClubStreak ?? 0,
    inviteCode: row.inviteCode,
    inviteExpiresAt: row.inviteExpiresAt?.toISOString() ?? null,
    inviteRevokedAt: row.inviteRevokedAt?.toISOString() ?? null,
    visibility: (row.visibility as "public" | "private") || "public",
    maxMembers: row.maxMembers ?? 20,
  };
}

/** Full AppState hydrate for an authenticated user (server is source of truth). */
export async function loadAppStateForUser(userId: string): Promise<AppState | null> {
  await syncUserPlanEntitlements(userId);
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return null;

  const blocked = await blockedIdsFor(userId);
  const blockedSet = new Set(blocked);
  const friendIds = await friendIdsFor(userId);

  const [
    watchlists,
    friendRequests,
    parties,
    partyJoinRequests,
    partyMessages,
    partyReactions,
    playbackRows,
    activities,
  ] = await Promise.all([
    prisma.watchlist.findMany({
      where: {
        OR: [{ ownerId: userId }, { isPublic: true }],
      },
      include: { items: { orderBy: { addedAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.party.findMany({
      where: { status: "open" },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partyJoinRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.partyMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.partyReaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.partyPlaybackSync.findMany(),
    prisma.activity.findMany({
      where: {
        OR: [{ userId }, { userId: { in: friendIds } }],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const partyPlaybackSync: PartyPlaybackSync[] = playbackRows.map((p) => ({
    partyId: p.partyId,
    positionSec: p.positionSec,
    playing: p.playing,
    watchStartedAt: p.watchStartedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    updatedBy: p.updatedBy,
  }));

  return {
    currentUserId: userId,
    watchlists: watchlists.map(mapWatchlist),
    currentlyWatchingId: me.currentlyWatchingId,
    currentlyWatchingServiceId:
      (me.currentlyWatchingServiceId as StreamingServiceId | null) ?? null,
    watchingProgressPercent: me.watchingProgressPercent,
    watchingStartedAt: me.watchingStartedAt?.toISOString() ?? null,
    recentlyWatchedIds: parseJson<string[]>(me.recentlyWatchedIdsJson, []),
    activities: activities.map(
      (a): Activity => ({
        id: a.id,
        userId: a.userId,
        type: a.type as ActivityType,
        movieId: a.movieId,
        watchlistId: a.watchlistId ?? undefined,
        partyId: a.partyId ?? undefined,
        serviceId: (a.serviceId as StreamingServiceId | null) ?? undefined,
        progressPercent: a.progressPercent,
        createdAt: a.createdAt.toISOString(),
      })
    ),
    watchingPublic: me.publicWatching,
    friendIds,
    friendRequests: friendRequests.map(
      (r): FriendRequest => ({
        id: r.id,
        fromUserId: r.fromUserId,
        toUserId: r.toUserId,
        status: r.status as RequestStatus,
        createdAt: r.createdAt.toISOString(),
      })
    ),
    parties: parties
      .filter((p) => !blockedSet.has(p.hostId))
      .map(mapParty),
    partyJoinRequests: partyJoinRequests.map(
      (r): PartyJoinRequest => ({
        id: r.id,
        partyId: r.partyId,
        fromUserId: r.fromUserId,
        status: r.status as RequestStatus,
        createdAt: r.createdAt.toISOString(),
      })
    ),
    partyMessages: partyMessages.map(
      (m): PartyMessage => ({
        id: m.id,
        partyId: m.partyId,
        userId: m.userId,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })
    ),
    partyReactions: partyReactions.map(
      (r): PartyReaction => ({
        id: r.id,
        partyId: r.partyId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })
    ),
    partyPlaybackSync,
    plan: (me.plan as PlanId) || "free",
    partyTrialEndsAt: me.partyTrialEndsAt?.toISOString() ?? null,
    freeHostsRemaining: me.freeHostsRemaining ?? 0,
    stripeCustomerId: me.stripeCustomerId,
    stripeSubscriptionId: me.stripeSubscriptionId,
    socialLinks: {
      ...EMPTY_SOCIAL_LINKS,
      ...parseJson<Partial<SocialLinks>>(me.socialLinksJson, {}),
    },
    linkedServices: parseJson<StreamingServiceId[]>(me.linkedServicesJson, []).filter(
      isStreamingServiceId
    ),
    blockedUserIds: blocked,
    cookieConsent: "unknown",
    ageConfirmed: me.ageVerified,
  };
}

export async function listDirectoryUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({
    orderBy: { handle: "asc" },
  });
  const users = rows.map(mapPublicUser);
  const friendships = await prisma.friendship.findMany();
  const byUser = new Map<string, string[]>();
  for (const f of friendships) {
    const list = byUser.get(f.userId) || [];
    list.push(f.friendId);
    byUser.set(f.userId, list);
  }
  return users.map((u) => ({
    ...u,
    friendIds: byUser.get(u.id) || [],
  }));
}

/** Find users by @handle or display name (soft-launch findability). */
export async function searchDirectoryUsers(
  query: string,
  opts?: { limit?: number; excludeUserId?: string }
): Promise<User[]> {
  const raw = query.trim().replace(/^@+/, "");
  if (raw.length < 1) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 30);
  const useInsensitive = (process.env.DATABASE_URL || "").startsWith("postgres");
  const handleNeedle = useInsensitive
    ? raw
    : raw.toLowerCase().replace(/[^a-z0-9_]/g, "") || raw.toLowerCase();
  const handleFilter = useInsensitive
    ? ({ contains: handleNeedle, mode: "insensitive" } as const)
    : ({ contains: handleNeedle } as const);
  const nameFilter = useInsensitive
    ? ({ contains: raw, mode: "insensitive" } as const)
    : ({ contains: raw } as const);

  const rows = await prisma.user.findMany({
    where: {
      bannedAt: null,
      ...(opts?.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
      OR: [{ handle: handleFilter }, { name: nameFilter }],
    },
    take: Math.min(limit * 3, 60),
  });

  const needle = raw.toLowerCase();
  const ranked = rows
    .map((row) => {
      const handle = row.handle.toLowerCase();
      const name = row.name.toLowerCase();
      let score = 0;
      if (handle === needle) score += 100;
      else if (handle.startsWith(needle)) score += 50;
      else if (handle.includes(needle)) score += 20;
      if (name === needle) score += 40;
      else if (name.startsWith(needle)) score += 15;
      else if (name.includes(needle)) score += 5;
      return { row, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.row.handle.localeCompare(b.row.handle))
    .slice(0, limit);

  return ranked.map((r) => mapPublicUser(r.row));
}

export async function pushActivity(
  userId: string,
  partial: Omit<Activity, "id" | "userId" | "createdAt">
) {
  await prisma.activity.create({
    data: {
      id: uid("a"),
      userId,
      type: partial.type,
      movieId: partial.movieId,
      watchlistId: partial.watchlistId,
      partyId: partial.partyId,
      serviceId: partial.serviceId ?? null,
      progressPercent: partial.progressPercent ?? null,
    },
  });
}

function cosmeticAllowed(
  plan: PlanId | string | null | undefined,
  tier: "free" | "party" | undefined
) {
  return planAllowsTier(plan, tier || "free");
}

export async function updateProfile(
  userId: string,
  patch: {
    name?: string;
    bio?: string;
    socialLinks?: SocialLinks;
    publicWatching?: boolean;
    linkedServices?: StreamingServiceId[];
    ageConfirmed?: boolean;
    avatarHue?: number;
    avatarUrl?: string | null;
    useDicebearAvatar?: boolean;
    profileTheme?: string;
    borderStyle?: string;
    accentColor?: string;
    accentPalette?: string;
    avatarStyle?: string;
    avatarFrame?: string;
    bannerStyle?: string;
    patternOverlay?: string;
    nameplateStyle?: string;
    profileBadgeIds?: string[];
    favoriteMovieIds?: string[];
    favoritePeople?: FavoritePerson[];
    partyAvailability?: unknown;
    friendCircles?: unknown;
  }
) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  const plan = (me?.plan as PlanId) || "free";
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = sanitizeText(patch.name, 80) || "Watcher";
  if (patch.bio !== undefined) data.bio = sanitizeText(patch.bio, 280);
  if (patch.socialLinks !== undefined) {
    data.socialLinksJson = JSON.stringify(patch.socialLinks);
  }
  if (patch.publicWatching !== undefined) data.publicWatching = patch.publicWatching;
  if (patch.linkedServices !== undefined) {
    data.linkedServicesJson = JSON.stringify(patch.linkedServices);
  }
  if (patch.ageConfirmed !== undefined) data.ageVerified = patch.ageConfirmed;
  if (patch.avatarHue !== undefined) {
    data.avatarHue = Math.max(0, Math.min(359, Math.round(patch.avatarHue)));
  }
  if (patch.useDicebearAvatar) {
    data.avatarUrl = dicebearAvatar(me?.handle || userId);
    data.avatarStyle = "avataaars";
  } else if (patch.avatarStyle !== undefined) {
    const style = normalizeAvatarStyle(patch.avatarStyle);
    const meta = AVATAR_STYLES.find((s) => s.id === style);
    if (cosmeticAllowed(plan, meta?.tier)) {
      data.avatarStyle = style;
      if (style === "hue") {
        data.avatarUrl = null;
      } else if (style !== "photo") {
        const url = dicebearUrlForStyle(style, me?.handle || userId);
        if (url) data.avatarUrl = url;
      }
    }
  } else if (patch.avatarUrl !== undefined) {
    data.avatarUrl = sanitizeAvatarUrl(patch.avatarUrl);
    if (patch.avatarUrl) data.avatarStyle = "photo";
  }
  if (patch.profileTheme !== undefined) {
    const theme = normalizeProfileTheme(patch.profileTheme);
    const meta = PROFILE_THEMES.find((t) => t.id === theme);
    if (cosmeticAllowed(plan, meta?.tier)) data.profileTheme = theme;
  }
  if (patch.borderStyle !== undefined) {
    const border = normalizeBorderStyle(patch.borderStyle);
    const meta = BORDER_STYLES.find((b) => b.id === border);
    if (cosmeticAllowed(plan, meta?.tier)) data.borderStyle = border;
  }
  if (patch.accentPalette !== undefined) {
    const palette = normalizeAccentPalette(patch.accentPalette);
    const meta = ACCENT_PALETTES.find((p) => p.id === palette);
    if (cosmeticAllowed(plan, meta?.tier)) {
      data.accentPalette = palette;
      if (palette !== "custom") {
        data.accentColor = paletteHex(palette);
      }
    }
  }
  if (patch.accentColor !== undefined) {
    data.accentColor = sanitizeHexColor(patch.accentColor);
    data.accentPalette = "custom";
  }
  if (patch.avatarFrame !== undefined) {
    const frame = normalizeAvatarFrame(patch.avatarFrame);
    const meta = AVATAR_FRAMES.find((f) => f.id === frame);
    if (cosmeticAllowed(plan, meta?.tier)) data.avatarFrame = frame;
  }
  if (patch.bannerStyle !== undefined) {
    const banner = normalizeBannerStyle(patch.bannerStyle);
    const meta = BANNER_STYLES.find((b) => b.id === banner);
    if (cosmeticAllowed(plan, meta?.tier)) data.bannerStyle = banner;
  }
  if (patch.patternOverlay !== undefined) {
    const pattern = normalizePatternOverlay(patch.patternOverlay);
    const meta = PATTERN_OVERLAYS.find((p) => p.id === pattern);
    if (cosmeticAllowed(plan, meta?.tier)) data.patternOverlay = pattern;
  }
  if (patch.nameplateStyle !== undefined) {
    const plate = normalizeNameplateStyle(patch.nameplateStyle);
    const meta = NAMEPLATE_STYLES.find((n) => n.id === plate);
    if (cosmeticAllowed(plan, meta?.tier)) data.nameplateStyle = plate;
  }
  if (patch.profileBadgeIds !== undefined) {
    data.profileBadgeIdsJson = JSON.stringify(
      sanitizeProfileBadgeIds(patch.profileBadgeIds, plan)
    );
  }
  if (patch.favoriteMovieIds !== undefined) {
    const ids = patch.favoriteMovieIds
      .filter((x) => typeof x === "string" && x.length > 0 && x.length < 80)
      .slice(0, 8);
    data.favoriteMovieIdsJson = JSON.stringify(ids);
  }
  if (patch.favoritePeople !== undefined) {
    const people = patch.favoritePeople
      .filter(
        (p) =>
          p &&
          typeof p.id === "number" &&
          typeof p.name === "string" &&
          p.name.trim().length > 0
      )
      .map((p) => ({
        id: p.id,
        name: sanitizeText(p.name, 80),
        department:
          p.department === "Directing"
            ? "Directing"
            : p.department === "Acting"
              ? "Acting"
              : "Other",
        profilePath:
          typeof p.profilePath === "string" ? p.profilePath.slice(0, 200) : null,
      }))
      .slice(0, 8);
    data.favoritePeopleJson = JSON.stringify(people);
  }
  if (patch.partyAvailability !== undefined) {
    const a = parsePartyAvailability(patch.partyAvailability);
    data.partyAvailabilityJson = JSON.stringify({
      status: a.status,
      until: a.until || null,
      note: a.note ? sanitizeText(a.note, 80) : undefined,
    });
  }
  if (patch.friendCircles !== undefined) {
    data.friendCirclesJson = JSON.stringify(
      parseFriendCircles(patch.friendCircles)
    );
  }
  if (Object.keys(data).length === 0) return;
  await prisma.user.update({ where: { id: userId }, data });
}

export async function setPresence(
  userId: string,
  input: {
    movieId: string | null;
    serviceId?: StreamingServiceId | null;
    progressPercent?: number | null;
    /** Reset the started-at join cue (default: when title changes) */
    startTracker?: boolean;
  }
) {
  const movieId = input.movieId;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  const titleChanged = Boolean(movieId && movieId !== me?.currentlyWatchingId);
  const startTracker = Boolean(input.startTracker) || titleChanged;
  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentlyWatchingId: movieId,
      currentlyWatchingServiceId: movieId ? input.serviceId ?? null : null,
      watchingProgressPercent: movieId
        ? input.progressPercent !== undefined
          ? input.progressPercent
          : titleChanged
            ? 0
            : me?.watchingProgressPercent ?? 0
        : null,
      watchingStartedAt: movieId
        ? startTracker
          ? now
          : me?.watchingStartedAt ?? now
        : null,
    },
  });
  if (movieId) {
    await pushActivity(userId, {
      type: "watching",
      movieId,
      serviceId: input.serviceId ?? undefined,
      progressPercent: input.progressPercent ?? 0,
    });
  }
}

export async function setWatchingProgress(userId: string, percent: number | null) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      watchingProgressPercent:
        percent === null ? null : Math.max(0, Math.min(100, Math.round(percent))),
    },
  });
}

export async function markFinished(userId: string, movieId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return;
  const recent = parseJson<string[]>(me.recentlyWatchedIdsJson, []);
  const next = [movieId, ...recent.filter((id) => id !== movieId)].slice(0, 12);
  const clearing = me.currentlyWatchingId === movieId;
  await prisma.user.update({
    where: { id: userId },
    data: {
      recentlyWatchedIdsJson: JSON.stringify(next),
      ...(clearing
        ? {
            currentlyWatchingId: null,
            currentlyWatchingServiceId: null,
            watchingProgressPercent: null,
            watchingStartedAt: null,
          }
        : {}),
    },
  });
  await pushActivity(userId, {
    type: "finished",
    movieId,
    serviceId: (me.currentlyWatchingServiceId as StreamingServiceId | null) ?? undefined,
  });
}

export async function createWatchlistDb(
  userId: string,
  name: string,
  description: string
): Promise<{ ok: true; value: Watchlist } | { ok: false; error: string }> {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return { ok: false, error: "User not found" };
  const limit = getPlan(me.plan as PlanId).limits.maxWatchlists;
  const count = await prisma.watchlist.count({ where: { ownerId: userId } });
  if (limit !== null && count >= limit) {
    return {
      ok: false,
      error: `Free plan allows ${limit} watchlists. Upgrade to Plus for unlimited lists.`,
    };
  }
  const row = await prisma.watchlist.create({
    data: {
      id: uid("wl"),
      name: sanitizeText(name, 80) || "Untitled list",
      description: sanitizeText(description, 240),
      ownerId: userId,
      isPublic: true,
    },
    include: { items: true },
  });
  return { ok: true, value: mapWatchlist(row) };
}

export async function updateWatchlistDb(
  userId: string,
  id: string,
  patch: { name?: string; description?: string; isPublic?: boolean }
) {
  const existing = await prisma.watchlist.findFirst({
    where: { id, ownerId: userId },
  });
  if (!existing) return null;
  const row = await prisma.watchlist.update({
    where: { id },
    data: {
      ...(patch.name !== undefined
        ? { name: sanitizeText(patch.name, 80) || existing.name }
        : {}),
      ...(patch.description !== undefined
        ? { description: sanitizeText(patch.description, 240) }
        : {}),
      ...(patch.isPublic !== undefined ? { isPublic: patch.isPublic } : {}),
    },
    include: { items: true },
  });
  return mapWatchlist(row);
}

export async function deleteWatchlistDb(userId: string, id: string) {
  const existing = await prisma.watchlist.findFirst({
    where: { id, ownerId: userId },
  });
  if (!existing) return false;
  await prisma.watchlist.delete({ where: { id } });
  return true;
}

export async function addWatchlistItemDb(
  userId: string,
  watchlistId: string,
  movieId: string
) {
  const list = await prisma.watchlist.findFirst({
    where: { id: watchlistId, ownerId: userId },
  });
  if (!list) return null;
  await prisma.watchlistItem.upsert({
    where: {
      watchlistId_movieId: { watchlistId, movieId },
    },
    create: { watchlistId, movieId },
    update: {},
  });
  await pushActivity(userId, {
    type: "watchlist_add",
    movieId,
    watchlistId,
  });
  const row = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { items: true },
  });
  return row ? mapWatchlist(row) : null;
}

export async function removeWatchlistItemDb(
  userId: string,
  watchlistId: string,
  movieId: string
) {
  const list = await prisma.watchlist.findFirst({
    where: { id: watchlistId, ownerId: userId },
  });
  if (!list) return null;
  await prisma.watchlistItem.deleteMany({ where: { watchlistId, movieId } });
  const row = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { items: true },
  });
  return row ? mapWatchlist(row) : null;
}

export async function sendFriendRequestDb(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) return { error: "Cannot friend yourself" };
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: fromUserId, blockedId: toUserId },
        { blockerId: toUserId, blockedId: fromUserId },
      ],
    },
  });
  if (blocked) return { error: "Blocked" };
  const alreadyFriends = await prisma.friendship.findFirst({
    where: { userId: fromUserId, friendId: toUserId },
  });
  if (alreadyFriends) return { error: "Already friends" };
  const pending = await prisma.friendRequest.findFirst({
    where: {
      status: "pending",
      OR: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    },
  });
  if (pending) return { error: "Request already pending" };
  const row = await prisma.friendRequest.create({
    data: {
      id: uid("fr"),
      fromUserId,
      toUserId,
      status: "pending",
    },
  });
  return {
    request: {
      id: row.id,
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      status: row.status as RequestStatus,
      createdAt: row.createdAt.toISOString(),
    } satisfies FriendRequest,
  };
}

export async function acceptFriendRequestDb(userId: string, requestId: string) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending" || req.toUserId !== userId) {
    return { error: "Request not found" };
  }
  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    }),
    prisma.friendship.upsert({
      where: {
        userId_friendId: { userId, friendId: req.fromUserId },
      },
      create: { userId, friendId: req.fromUserId },
      update: {},
    }),
    prisma.friendship.upsert({
      where: {
        userId_friendId: { userId: req.fromUserId, friendId: userId },
      },
      create: { userId: req.fromUserId, friendId: userId },
      update: {},
    }),
  ]);
  await pushActivity(userId, {
    type: "friend_added",
    movieId: "m1",
  });
  return { ok: true };
}

export async function declineFriendRequestDb(userId: string, requestId: string) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending" || req.toUserId !== userId) {
    return { error: "Request not found" };
  }
  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "declined" },
  });
  return { ok: true };
}

export async function createPartyDb(
  userId: string,
  input: {
    name: string;
    movieId: string;
    startsAt: string | null;
    isLive: boolean;
    serviceId?: StreamingServiceId | null;
    syncMode?: WatchParty["syncMode"];
    coHostIds?: string[];
    recurringWeekly?: boolean;
  }
): Promise<{ ok: true; value: WatchParty } | { ok: false; error: string }> {
  await syncUserPlanEntitlements(userId);
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return { ok: false, error: "User not found" };
  const planId = (me.plan as PlanId) || "free";
  const freeHosts = me.freeHostsRemaining ?? 0;
  const onPartyPlan = getPlan(planId).limits.canHostParties;
  if (!effectiveCanHostParties({ plan: planId, freeHostsRemaining: freeHosts })) {
    return {
      ok: false,
      error:
        "Hosting watch parties requires the Party plan (or your one free host credit).",
    };
  }
  const consumeFreeHost = !onPartyPlan && freeHosts > 0;
  const syncMode = input.syncMode || "own_account";
  const partyId = uid("wp");
  const row = await prisma.party.create({
    data: {
      id: partyId,
      name: sanitizeText(input.name, 80) || "Watch party",
      hostId: userId,
      movieId: input.movieId,
      startsAt: input.isLive || !input.startsAt ? null : new Date(input.startsAt),
      isLive: input.isLive,
      status: "open",
      serviceId: syncMode === "watchify_free" ? null : input.serviceId ?? null,
      syncMode,
      coHostIdsJson: JSON.stringify(
        (input.coHostIds || []).filter((id) => id !== userId)
      ),
      recurringWeekly: Boolean(input.recurringWeekly),
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      members: { create: [{ userId }] },
      playbackSync: {
        create: {
          positionSec: 0,
          playing: false,
          updatedBy: userId,
        },
      },
    },
    include: { members: true },
  });
  if (input.isLive) {
    await setPresence(userId, {
      movieId: input.movieId,
      serviceId: syncMode === "watchify_free" ? null : input.serviceId ?? null,
      progressPercent: 0,
    });
  }
  if (consumeFreeHost) {
    await prisma.user.update({
      where: { id: userId },
      data: { freeHostsRemaining: Math.max(0, freeHosts - 1) },
    });
  }
  await pushActivity(userId, {
    type: "party_created",
    movieId: input.movieId,
    partyId,
    serviceId: (row.serviceId as StreamingServiceId | null) ?? undefined,
  });
  return { ok: true, value: mapParty(row) };
}

/** Host flips a scheduled room to live now. */
export async function goLivePartyDb(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true, host: { select: { name: true } } },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  if (party.hostId !== userId && !coHosts.includes(userId)) {
    return { error: "Forbidden" };
  }
  const row = await prisma.party.update({
    where: { id: partyId },
    data: { isLive: true, startsAt: null },
    include: { members: true },
  });

  // Low-risk: email members when Resend/SMTP is configured (no cron needed).
  void notifyPartyMembersGoLive({
    partyId: row.id,
    partyName: row.name,
    movieId: row.movieId,
    hostName: party.host.name,
    inviteCode: row.inviteCode || row.id,
    memberIds: row.members.map((m) => m.userId),
    hostId: row.hostId,
  });
  void import("./reminders")
    .then((m) => m.dispatchPartyReminders({ partyId: row.id, forceLive: true }))
    .catch(() => undefined);

  return { ok: true as const, party: mapParty(row) };
}

async function notifyPartyMembersGoLive(input: {
  partyId: string;
  partyName: string;
  movieId: string;
  hostName: string;
  inviteCode: string;
  memberIds: string[];
  hostId: string;
}) {
  try {
    const { productEmailEnabled, partyLiveEmailContent, sendEmail } =
      await import("../email");
    if (!productEmailEnabled()) return;
    const { getMovie } = await import("../movies");
    const { absoluteUrl } = await import("../site");
    const movie = getMovie(input.movieId);
    const content = partyLiveEmailContent({
      partyName: input.partyName,
      movieTitle: movie?.title || "a title",
      hostName: input.hostName,
      inviteUrl: absoluteUrl(`/share/party/${input.inviteCode}`),
    });
    const recipients = await prisma.user.findMany({
      where: {
        id: { in: input.memberIds.filter((id) => id !== input.hostId) },
        bannedAt: null,
      },
      select: { email: true },
    });
    for (const r of recipients) {
      if (!r.email) continue;
      await sendEmail({
        to: r.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    }
  } catch (err) {
    console.error("[watchify] party live email failed", err);
  }
}

/**
 * RSVP “I’m in” for a scheduled party — joins as member via invite path.
 */
export async function rsvpPartyDb(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  const invite = party.inviteCode || party.id;
  return joinPartyByInviteDb(userId, invite);
}

/** Non-host member leaves a room (host must End party). */
export async function leavePartyDb(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  if (party.hostId === userId) {
    return { error: "Host can’t leave — end the party instead." };
  }
  const isMember = party.members.some((m) => m.userId === userId);
  if (!isMember) return { error: "Not a member" };

  const coHosts = parseJson<string[]>(party.coHostIdsJson, []).filter(
    (id) => id !== userId
  );
  await prisma.$transaction([
    prisma.partyMember.deleteMany({
      where: { partyId, userId },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: { coHostIdsJson: JSON.stringify(coHosts) },
    }),
  ]);
  return { ok: true as const };
}

/** Host / co-host removes another member from the room. */
export async function removePartyMemberDb(
  actorId: string,
  partyId: string,
  targetUserId: string
) {
  if (!targetUserId || targetUserId === actorId) {
    return { error: "Invalid target" };
  }
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  const actorOk =
    party.hostId === actorId || coHosts.includes(actorId);
  if (!actorOk) return { error: "Only host or co-host can remove members" };
  if (party.hostId === targetUserId) {
    return { error: "Cannot remove the host" };
  }
  const isMember = party.members.some((m) => m.userId === targetUserId);
  const isCo = coHosts.includes(targetUserId);
  if (!isMember && !isCo) return { error: "Not a member" };

  const nextCoHosts = coHosts.filter((id) => id !== targetUserId);
  await prisma.$transaction([
    prisma.partyMember.deleteMany({
      where: { partyId, userId: targetUserId },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: { coHostIdsJson: JSON.stringify(nextCoHosts) },
    }),
  ]);
  return { ok: true as const };
}

/** Host updates name / title / co-hosts without remaking the room. */
export async function updatePartyDb(
  userId: string,
  partyId: string,
  input: {
    name?: string;
    movieId?: string;
    coHostIds?: string[];
  }
) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  if (party.hostId !== userId) return { error: "Only the host can edit" };

  const data: {
    name?: string;
    movieId?: string;
    coHostIdsJson?: string;
  } = {};
  if (typeof input.name === "string") {
    data.name = sanitizeText(input.name, 80) || party.name;
  }
  if (typeof input.movieId === "string" && input.movieId.trim()) {
    data.movieId = input.movieId.trim();
  }
  if (Array.isArray(input.coHostIds)) {
    data.coHostIdsJson = JSON.stringify(
      input.coHostIds.filter((id) => id && id !== userId)
    );
  }
  if (!Object.keys(data).length) return { error: "Nothing to update" };

  const row = await prisma.party.update({
    where: { id: partyId },
    data,
    include: { members: true },
  });
  return { ok: true as const, party: mapParty(row) };
}

/** Host or co-host (claim) transfers hosting to a room member / co-host. */
export async function transferPartyHostDb(
  actorId: string,
  partyId: string,
  toUserId?: string
) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  const memberIds = party.members.map((m) => m.userId);

  let nextHost = toUserId || "";
  if (!nextHost) {
    // Claim path: co-host claims when host is gone
    if (!coHosts.includes(actorId)) {
      return { error: "Only a co-host can claim host" };
    }
    nextHost = actorId;
  }

  if (nextHost === party.hostId) {
    return { error: "Already host" };
  }

  const eligible =
    memberIds.includes(nextHost) ||
    coHosts.includes(nextHost) ||
    nextHost === actorId;
  if (!eligible) return { error: "Target must be in the room" };

  const isHost = party.hostId === actorId;
  const isClaim = !isHost && coHosts.includes(actorId) && nextHost === actorId;
  if (!isHost && !isClaim) {
    return { error: "Only the host can transfer (or a co-host can claim)" };
  }

  const prevHost = party.hostId;
  const nextCoHosts = Array.from(
    new Set(
      [...coHosts, prevHost]
        .filter((id) => id && id !== nextHost)
    )
  );

  // Ensure new host is a member
  if (!memberIds.includes(nextHost)) {
    await prisma.partyMember.create({
      data: { partyId, userId: nextHost },
    });
  }

  const row = await prisma.party.update({
    where: { id: partyId },
    data: {
      hostId: nextHost,
      coHostIdsJson: JSON.stringify(nextCoHosts),
    },
    include: { members: true },
  });
  return { ok: true as const, party: mapParty(row), previousHostId: prevHost };
}

export async function endPartyDb(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return { error: "Not found" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  if (party.hostId !== userId && !coHosts.includes(userId)) {
    return { error: "Forbidden" };
  }
  await prisma.party.update({
    where: { id: partyId },
    data: { status: "ended", isLive: false },
  });

  // Recurring weekly Watch Club: spawn next week, keep invite cohort, notify, streak.
  if (party.recurringWeekly) {
    const nextStart = new Date(
      (party.startsAt?.getTime() || Date.now()) + 7 * 86_400_000
    );
    const nextId = uid("wp");
    const prevStreak = party.hostClubStreak ?? 0;
    const nextStreak = prevStreak + 1;
    const cohort = await prisma.partyMember.findMany({
      where: { partyId },
      select: { userId: true },
    });
    const memberIds = Array.from(
      new Set([party.hostId, ...cohort.map((m) => m.userId)])
    );
    const spawned = await prisma.party.create({
      data: {
        id: nextId,
        name: party.name,
        hostId: party.hostId,
        movieId: party.movieId,
        startsAt: nextStart,
        isLive: false,
        status: "open",
        serviceId: party.serviceId,
        syncMode: party.syncMode,
        coHostIdsJson: party.coHostIdsJson,
        recurringWeekly: true,
        clubParentId: partyId,
        hostClubStreak: nextStreak,
        inviteExpiresAt: new Date(nextStart.getTime() + 7 * 86_400_000),
        visibility: party.visibility,
        maxMembers: party.maxMembers,
        members: {
          create: memberIds.map((userId) => ({ userId })),
        },
        playbackSync: {
          create: {
            positionSec: 0,
            playing: false,
            updatedBy: party.hostId,
          },
        },
      },
    });
    void notifyWeeklyClubSpawn({
      partyId: nextId,
      partyName: party.name,
      movieId: party.movieId,
      hostId: party.hostId,
      memberIds,
      nextStartsAt: nextStart,
      hostClubStreak: nextStreak,
      inviteCode: spawned.inviteCode || nextId,
    });
    return {
      ok: true,
      nextPartyId: nextId,
      nextStartsAt: nextStart.toISOString(),
      hostClubStreak: nextStreak,
    };
  }

  return { ok: true };
}

async function notifyWeeklyClubSpawn(input: {
  partyId: string;
  partyName: string;
  movieId: string;
  hostId: string;
  memberIds: string[];
  nextStartsAt: Date;
  hostClubStreak: number;
  inviteCode: string;
}) {
  try {
    const { productEmailEnabled, sendEmail } = await import("../email");
    const { getMovie } = await import("../movies");
    const { absoluteUrl } = await import("../site");
    const movie = getMovie(input.movieId);
    const host = await prisma.user.findUnique({
      where: { id: input.hostId },
      select: { name: true, email: true },
    });
    const inviteUrl = absoluteUrl(`/share/party/${input.inviteCode}`);
    const when = input.nextStartsAt.toLocaleString();
    const subject = `Weekly Watch Club: ${input.partyName} · week ${input.hostClubStreak}`;
    const text = `${host?.name || "Your host"} locked next week’s Watch Club for ${
      movie?.title || "the title"
    } on ${when}.\n\nHost streak: ${input.hostClubStreak} week(s).\nJoin: ${inviteUrl}\n`;
    const html = `<p><strong>${host?.name || "Your host"}</strong> spawned next week’s Watch Club (<em>${
      input.partyName
    }</em> · ${movie?.title || "title"}) for <strong>${when}</strong>.</p><p>Host streak: ${
      input.hostClubStreak
    } week(s).</p><p><a href="${inviteUrl}">Open next week’s room</a></p>`;

    // Refresh invite code from DB if available
    const next = await prisma.party.findUnique({
      where: { id: input.partyId },
      select: { inviteCode: true },
    });
    const url = absoluteUrl(`/share/party/${next?.inviteCode || input.inviteCode}`);

    if (!productEmailEnabled()) {
      console.info("[watchify:watch-club]", subject, url);
      return;
    }
    const recipients = await prisma.user.findMany({
      where: {
        id: { in: input.memberIds },
        bannedAt: null,
        isGuest: false,
      },
      select: { email: true },
    });
    for (const r of recipients) {
      if (!r.email) continue;
      await sendEmail({
        to: r.email,
        subject,
        text: text.replace(inviteUrl, url),
        html: html.replace(inviteUrl, url),
      });
    }
  } catch (err) {
    console.error("[watchify] weekly club notify failed", err);
  }
}

export async function requestJoinPartyDb(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party || party.status !== "open") return { error: "Party not open" };
  if (party.hostId === userId) return { error: "Already host" };
  if (party.members.some((m) => m.userId === userId)) {
    return { error: "Already member" };
  }
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: party.hostId },
        { blockerId: party.hostId, blockedId: userId },
      ],
    },
  });
  if (blocked) return { error: "Blocked" };
  const pending = await prisma.partyJoinRequest.findFirst({
    where: { partyId, fromUserId: userId, status: "pending" },
  });
  if (pending) return { error: "Already requested" };
  const row = await prisma.partyJoinRequest.create({
    data: {
      id: uid("pjr"),
      partyId,
      fromUserId: userId,
      status: "pending",
    },
  });
  return {
    request: {
      id: row.id,
      partyId: row.partyId,
      fromUserId: row.fromUserId,
      status: row.status as RequestStatus,
      createdAt: row.createdAt.toISOString(),
    } satisfies PartyJoinRequest,
  };
}

/**
 * One-tap invite: creates PartyMember immediately (invite code or party id).
 * Prefer inviteCode; party id kept for older `/parties?join=` links.
 */
export async function joinPartyByInviteDb(userId: string, invite: string) {
  const code = sanitizeText(invite, 64);
  if (!code) return { error: "Invite required" };

  const party = await prisma.party.findFirst({
    where: {
      status: "open",
      OR: [{ inviteCode: code }, { id: code }],
    },
    include: { members: true },
  });
  if (!party) return { error: "Invite not found or party closed" };
  if (party.inviteRevokedAt) return { error: "Invite revoked by host" };
  if (party.inviteExpiresAt && party.inviteExpiresAt < new Date()) return { error: "Invite expired" };
  if (party.members.length >= party.maxMembers) return { error: "Party is full" };

  if (party.members.some((m) => m.userId === userId) || party.hostId === userId) {
    return { ok: true as const, party: mapParty(party), alreadyMember: true };
  }

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: party.hostId },
        { blockerId: party.hostId, blockedId: userId },
      ],
    },
  });
  if (blocked) return { error: "Blocked" };

  await prisma.$transaction([
    prisma.partyMember.create({
      data: { partyId: party.id, userId },
    }),
    prisma.partyJoinRequest.updateMany({
      where: { partyId: party.id, fromUserId: userId, status: "pending" },
      data: { status: "accepted" },
    }),
  ]);

  await pushActivity(userId, {
    type: "party_joined",
    movieId: party.movieId,
    partyId: party.id,
  });

  const refreshed = await prisma.party.findUnique({
    where: { id: party.id },
    include: { members: true },
  });
  if (!refreshed) return { error: "Party missing after join" };
  return {
    ok: true as const,
    party: mapParty(refreshed),
    alreadyMember: false,
  };
}

export async function acceptJoinRequestDb(userId: string, requestId: string) {
  const req = await prisma.partyJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.status !== "pending") return { error: "Not found" };
  const party = await prisma.party.findUnique({ where: { id: req.partyId } });
  if (!party) return { error: "Party missing" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  if (party.hostId !== userId && !coHosts.includes(userId)) {
    return { error: "Forbidden" };
  }
  const blocked = await prisma.block.findFirst({
    where: { blockerId: userId, blockedId: req.fromUserId },
  });
  if (blocked) {
    await prisma.partyJoinRequest.update({
      where: { id: requestId },
      data: { status: "declined" },
    });
    return { error: "Blocked user" };
  }
  await prisma.$transaction([
    prisma.partyJoinRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    }),
    prisma.partyMember.upsert({
      where: {
        partyId_userId: { partyId: req.partyId, userId: req.fromUserId },
      },
      create: { partyId: req.partyId, userId: req.fromUserId },
      update: {},
    }),
  ]);
  await pushActivity(req.fromUserId, {
    type: "party_joined",
    movieId: party.movieId,
    partyId: party.id,
  });
  return { ok: true };
}

export async function declineJoinRequestDb(userId: string, requestId: string) {
  const req = await prisma.partyJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.status !== "pending") return { error: "Not found" };
  const party = await prisma.party.findUnique({ where: { id: req.partyId } });
  if (!party) return { error: "Party missing" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  if (party.hostId !== userId && !coHosts.includes(userId)) {
    return { error: "Forbidden" };
  }
  await prisma.partyJoinRequest.update({
    where: { id: requestId },
    data: { status: "declined" },
  });
  return { ok: true };
}

export async function postPartyMessageDb(
  userId: string,
  partyId: string,
  text: string
) {
  const cleaned = sanitizeText(text, 280);
  if (!cleaned) return { error: "Empty message" };
  const member = await prisma.partyMember.findFirst({
    where: { partyId, userId },
  });
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.status !== "open") return { error: "Party closed" };
  const coHosts = parseJson<string[]>(party.coHostIdsJson, []);
  if (
    !member &&
    party.hostId !== userId &&
    !coHosts.includes(userId)
  ) {
    return { error: "Not a member" };
  }
  const row = await prisma.partyMessage.create({
    data: {
      id: uid("pm"),
      partyId,
      userId,
      text: cleaned,
    },
  });
  return {
    message: {
      id: row.id,
      partyId: row.partyId,
      userId: row.userId,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
    } satisfies PartyMessage,
  };
}

export async function addPartyReactionDb(
  userId: string,
  partyId: string,
  emoji: string
) {
  const row = await prisma.partyReaction.create({
    data: {
      id: uid("pr"),
      partyId,
      userId,
      emoji: sanitizeText(emoji, 8) || "👍",
    },
  });
  return {
    reaction: {
      id: row.id,
      partyId: row.partyId,
      userId: row.userId,
      emoji: row.emoji,
      createdAt: row.createdAt.toISOString(),
    } satisfies PartyReaction,
  };
}

export async function updatePartyPlaybackDb(
  userId: string,
  partyId: string,
  positionSec: number,
  playing: boolean,
  opts?: { startTracker?: boolean }
) {
  const startTracker = Boolean(opts?.startTracker);
  const now = new Date();
  const existing = await prisma.partyPlaybackSync.findUnique({
    where: { partyId },
  });
  const watchStartedAt = startTracker
    ? now
    : existing?.watchStartedAt ?? (playing && !existing ? now : undefined);

  const row = await prisma.partyPlaybackSync.upsert({
    where: { partyId },
    create: {
      partyId,
      positionSec: Math.max(0, positionSec),
      playing,
      watchStartedAt: watchStartedAt ?? null,
      updatedBy: userId,
    },
    update: {
      positionSec: Math.max(0, positionSec),
      playing,
      updatedBy: userId,
      updatedAt: now,
      ...(startTracker ? { watchStartedAt: now } : {}),
    },
  });
  return {
    ok: true as const,
    sync: {
      partyId: row.partyId,
      positionSec: row.positionSec,
      playing: row.playing,
      watchStartedAt: row.watchStartedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    } satisfies PartyPlaybackSync,
  };
}

export async function blockUserDb(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return { error: "Cannot block yourself" };
  await prisma.$transaction([
    prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: blockerId, friendId: blockedId },
          { userId: blockedId, friendId: blockerId },
        ],
      },
    }),
    prisma.friendRequest.updateMany({
      where: {
        status: "pending",
        OR: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId },
        ],
      },
      data: { status: "declined" },
    }),
  ]);
  return { ok: true };
}

export async function unblockUserDb(blockerId: string, blockedId: string) {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  return { ok: true };
}

export async function linkServiceDb(userId: string, serviceId: StreamingServiceId) {
  if (!isStreamingServiceId(serviceId)) {
    return { error: "Unknown streaming service" };
  }
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return { error: "Not found" };
  const linked = parseJson<StreamingServiceId[]>(me.linkedServicesJson, []);
  if (linked.includes(serviceId)) return { ok: true as const, linked };
  const limit = getPlan(me.plan as PlanId).limits.maxLinkedServices;
  if (limit !== null && linked.length >= limit) {
    return {
      error: `Free plan can link ${limit} services. Upgrade to Plus to link all streamers.`,
    };
  }
  const next = [...linked, serviceId];
  await prisma.user.update({
    where: { id: userId },
    data: { linkedServicesJson: JSON.stringify(next) },
  });
  return { ok: true as const, linked: next };
}

export async function unlinkServiceDb(userId: string, serviceId: StreamingServiceId) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return { error: "Not found" };
  const linked = parseJson<StreamingServiceId[]>(me.linkedServicesJson, []).filter(
    (id) => id !== serviceId
  );
  await prisma.user.update({
    where: { id: userId },
    data: {
      linkedServicesJson: JSON.stringify(linked),
      currentlyWatchingServiceId:
        me.currentlyWatchingServiceId === serviceId
          ? null
          : me.currentlyWatchingServiceId,
    },
  });
  return { ok: true as const, linked };
}

export async function setSocialLinksDb(userId: string, links: SocialLinks) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return { error: "Not found" };
  if (!getPlan(me.plan as PlanId).limits.socialLinks) {
    return { error: "Connected social links require Plus or Party." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { socialLinksJson: JSON.stringify(links) },
  });
  return { ok: true as const };
}
