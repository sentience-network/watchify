import type { AppState } from "./types";
import { EMPTY_SOCIAL_LINKS } from "./types";

const KEY = "watchify-state-v6";

/** Empty shell — server hydrate fills real data when signed in. */
export function defaultState(): AppState {
  return {
    currentUserId: "",
    watchlists: [],
    currentlyWatchingId: null,
    currentlyWatchingServiceId: null,
    watchingProgressPercent: null,
    recentlyWatchedIds: [],
    activities: [],
    watchingPublic: true,
    friendIds: [],
    friendRequests: [],
    parties: [],
    partyJoinRequests: [],
    partyMessages: [],
    partyReactions: [],
    partyPlaybackSync: [],
    plan: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    socialLinks: { ...EMPTY_SOCIAL_LINKS },
    linkedServices: [],
    blockedUserIds: [],
    cookieConsent: "unknown",
    ageConfirmed: false,
  };
}

/** localStorage is a cache only — server state wins on conflict. */
export function loadCachedState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      socialLinks: { ...EMPTY_SOCIAL_LINKS, ...parsed.socialLinks },
      cookieConsent: parsed.cookieConsent ?? "unknown",
    };
  } catch {
    return defaultState();
  }
}

export function cacheState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

/** @deprecated use loadCachedState — kept for any stray imports */
export function loadState(): AppState {
  return loadCachedState();
}

/** @deprecated use cacheState */
export function saveState(state: AppState) {
  cacheState(state);
}
