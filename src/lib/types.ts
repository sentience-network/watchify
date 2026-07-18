import type { PlanId } from "./plans";
import type { StreamingServiceId } from "./streaming";

export type MovieProvider = {
  id: StreamingServiceId;
  name: string;
  deepLink: string;
  /** True when URL opens a specific title page (not just search). */
  titleSpecific?: boolean;
};

export type Movie = {
  id: string;
  title: string;
  year: number;
  overview: string;
  posterPath: string;
  backdropPath: string;
  genres: string[];
  runtime: number;
  rating: number;
  /** Official trailer YouTube video id (embed only) */
  trailerYoutubeId?: string;
  /** TMDB id for optional live watch/providers lookup */
  tmdbId?: number;
  /**
   * Direct playable URL for Watchify-hosted free/licensed titles only.
   * Never used for paid-streamer scrapes.
   */
  freePlaybackUrl?: string;
  /** How this title may be played on Watchify */
  licenseKind?: "catalog" | "trailer" | "public_domain" | "creative_commons" | "avod_sample";
  attribution?: { creator: string; license: string; licenseUrl: string; sourceUrl: string };
  /** Where to open on paid streamers (deep links / search — not piracy) */
  providers?: MovieProvider[];
};

export type Watchlist = {
  id: string;
  name: string;
  description: string;
  movieIds: string[];
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityType =
  | "watching"
  | "watchlist_add"
  | "finished"
  | "party_created"
  | "party_joined"
  | "friend_added";

export type Activity = {
  id: string;
  userId: string;
  type: ActivityType;
  movieId: string;
  watchlistId?: string;
  partyId?: string;
  /** Streaming service badge for social share (metadata only) */
  serviceId?: StreamingServiceId | null;
  progressPercent?: number | null;
  createdAt: string;
};

export type SocialLinks = {
  x: string;
  instagram: string;
  tiktok: string;
  letterboxd: string;
};

export type User = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarHue: number;
  currentlyWatchingId: string | null;
  currentlyWatchingServiceId?: StreamingServiceId | null;
  watchingProgressPercent?: number | null;
  recentlyWatchedIds: string[];
  friendIds: string[];
  socialLinks?: SocialLinks;
  /** Services they subscribe to (badge only — no credentials) */
  linkedServices?: StreamingServiceId[];
};

export type WatchPartyStatus = "open" | "ended";

export type WatchParty = {
  id: string;
  name: string;
  hostId: string;
  movieId: string;
  /** ISO timestamp, or null when the party is live right now */
  startsAt: string | null;
  isLive: boolean;
  memberIds: string[];
  status: WatchPartyStatus;
  createdAt: string;
  /** Host's streaming service for social context (not a shared stream) */
  serviceId?: StreamingServiceId | null;
  /**
   * Party mode:
   * - social: chat/reactions only
   * - own_account: Teleparty-style sync + deep links (each uses own login)
   * - watchify_free: synced playback of Watchify-hosted free title
   */
  syncMode?: "social" | "own_account" | "watchify_free";
  /** Co-hosts who can accept joins / end party */
  coHostIds?: string[];
  /** Soft recurring flag for host tools */
  recurringWeekly?: boolean;
  /** Opaque invite code for one-tap join links */
  inviteCode?: string;
  inviteExpiresAt?: string | null;
  inviteRevokedAt?: string | null;
  visibility?: "public" | "private";
  maxMembers?: number;
};

/** Who is currently connected to the party realtime room (ephemeral). */
export type PartyPresenceMember = {
  userId: string;
  name: string;
  handle: string;
  typing?: boolean;
};

/** Shared playhead for free Watchify titles or soft sync hints for own-account */
export type PartyPlaybackSync = {
  partyId: string;
  positionSec: number;
  playing: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type PartyMessage = {
  id: string;
  partyId: string;
  userId: string;
  text: string;
  createdAt: string;
};

export type PartyReaction = {
  id: string;
  partyId: string;
  userId: string;
  emoji: string;
  createdAt: string;
};

export type RequestStatus = "pending" | "accepted" | "declined";

export type PartyJoinRequest = {
  id: string;
  partyId: string;
  fromUserId: string;
  status: RequestStatus;
  createdAt: string;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: RequestStatus;
  createdAt: string;
};

export type AppState = {
  currentUserId: string;
  watchlists: Watchlist[];
  currentlyWatchingId: string | null;
  currentlyWatchingServiceId: StreamingServiceId | null;
  watchingProgressPercent: number | null;
  recentlyWatchedIds: string[];
  activities: Activity[];
  /** When true, strangers can see what you're watching */
  watchingPublic: boolean;
  friendIds: string[];
  friendRequests: FriendRequest[];
  parties: WatchParty[];
  partyJoinRequests: PartyJoinRequest[];
  partyMessages: PartyMessage[];
  partyReactions: PartyReaction[];
  partyPlaybackSync: PartyPlaybackSync[];
  /** Local plan mirror — maps to Stripe customer/subscription when configured */
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  socialLinks: SocialLinks;
  /** Linked streamers for badges — never store passwords */
  linkedServices: StreamingServiceId[];
  blockedUserIds: string[];
  cookieConsent: "unknown" | "accepted" | "essential";
  ageConfirmed: boolean;
};

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  x: "",
  instagram: "",
  tiktok: "",
  letterboxd: "",
};
