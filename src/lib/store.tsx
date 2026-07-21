"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getMovie } from "./movies";
import { getPlan, type PlanId } from "./plans";
import { sanitizeText } from "./sanitize";
import { cacheState, defaultState, loadCachedState } from "./storage";
import { getPartyRealtime } from "./party-realtime";
import type {
  Activity,
  AppState,
  FriendRequest,
  PartyJoinRequest,
  PartyMessage,
  PartyPlaybackSync,
  PartyReaction,
  SocialLinks,
  User,
  Watchlist,
  WatchParty,
} from "./types";
import { EMPTY_SOCIAL_LINKS } from "./types";
import type { StreamingServiceId } from "./streaming";

type CreateResult<T> = { ok: true; value: T } | { ok: false; error: string };

type Store = {
  ready: boolean;
  /** True after the first successful /api/me/state for this session. */
  serverHydrated: boolean;
  /** True when signed-in hydrate has been running > ~3s (Render wake). */
  hydratingSlow: boolean;
  /** Unread DM count for nav badges (polled). */
  unreadDmCount: number;
  state: AppState;
  directoryUsers: User[];
  currentUserId: string;
  createWatchlist: (
    name: string,
    description?: string
  ) => Promise<CreateResult<Watchlist>>;
  renameWatchlist: (id: string, name: string, description?: string) => void;
  deleteWatchlist: (id: string) => void;
  togglePublic: (id: string) => void;
  addToWatchlist: (watchlistId: string, movieId: string) => void;
  removeFromWatchlist: (watchlistId: string, movieId: string) => void;
  setCurrentlyWatching: (
    movieId: string | null,
    opts?: {
      serviceId?: StreamingServiceId | null;
      progressPercent?: number | null;
      startTracker?: boolean;
    }
  ) => void;
  /** Reset the public “started at” join cue for the current title. */
  restartWatchingTracker: () => void;
  setWatchingProgress: (percent: number | null) => void;
  markFinished: (movieId: string) => void;
  setWatchingPublic: (value: boolean) => void;
  linkStreamingService: (
    serviceId: StreamingServiceId
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  unlinkStreamingService: (
    serviceId: StreamingServiceId
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  createParty: (input: {
    name: string;
    movieId: string;
    startsAt: string | null;
    isLive: boolean;
    serviceId?: StreamingServiceId | null;
    syncMode?: WatchParty["syncMode"];
    coHostIds?: string[];
    recurringWeekly?: boolean;
  }) => Promise<CreateResult<WatchParty>>;
  endParty: (partyId: string) => Promise<{ nextPartyId?: string; nextStartsAt?: string } | void>;
  leaveParty: (partyId: string) => Promise<CreateResult<true>>;
  /** Host / co-host removes a member (HTTP fallback if realtime kick fails). */
  removePartyMember: (
    partyId: string,
    targetUserId: string
  ) => Promise<CreateResult<true>>;
  updateParty: (
    partyId: string,
    input: { name?: string; movieId?: string; coHostIds?: string[] }
  ) => Promise<CreateResult<WatchParty>>;
  requestJoinParty: (partyId: string) => void;
  /** One-tap invite — creates PartyMember and returns the party. */
  joinPartyByInvite: (
    invite: string
  ) => Promise<CreateResult<WatchParty>>;
  acceptJoinRequest: (requestId: string) => void;
  declineJoinRequest: (requestId: string) => void;
  postPartyMessage: (partyId: string, text: string) => void;
  addPartyReaction: (partyId: string, emoji: string) => void;
  updatePartyPlayback: (
    partyId: string,
    positionSec: number,
    playing: boolean,
    opts?: { startTracker?: boolean }
  ) => void;
  /** Host pressed play off-site — sets watchStartedAt for friends. */
  startPartyWatchTracker: (partyId: string, positionSec?: number) => void;
  /** Instant patches from Socket.io (deduped). */
  applyPartyMessage: (message: PartyMessage) => void;
  applyPartyReaction: (reaction: PartyReaction) => void;
  applyPartyPlayback: (sync: PartyPlaybackSync) => void;
  setRealtimeConnected: (connected: boolean) => void;
  realtimeConnected: boolean;
  sendFriendRequest: (toUserId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  /** Persists plan in DB (demo mode or after Stripe). Server is authority. */
  setPlanLocal: (
    plan: PlanId,
    stripe?: { customerId?: string | null; subscriptionId?: string | null }
  ) => Promise<void>;
  setSocialLinks: (
    links: Partial<SocialLinks>
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  setCookieConsent: (value: AppState["cookieConsent"]) => void;
  setAgeConfirmed: (value: boolean) => void;
  refreshFromServer: () => Promise<void>;
  myWatchlists: Watchlist[];
  feedActivities: Activity[];
  openParties: WatchParty[];
  myHostedJoinRequests: PartyJoinRequest[];
  incomingFriendRequests: FriendRequest[];
  outgoingFriendRequests: FriendRequest[];
  friendsWatching: {
    userId: string;
    movieId: string;
    isFriend: boolean;
    serviceId?: StreamingServiceId | null;
    progressPercent?: number | null;
  }[];
  publicWatching: {
    userId: string;
    movieId: string;
    isFriend: boolean;
    serviceId?: StreamingServiceId | null;
    progressPercent?: number | null;
    watchingStartedAt?: string | null;
  }[];
  isFriend: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  canHostParties: boolean;
  watchlistLimit: number | null;
  linkedServiceLimit: number | null;
};

const Ctx = createContext<Store | null>(null);

async function apiJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: (data as { error?: string }).error || res.statusText,
        status: res.status,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}

export function WatchifyProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const sessionUserId = session?.user?.id || "";
  const [state, setState] = useState<AppState>(defaultState);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [serverHydrated, setServerHydrated] = useState(false);
  const [hydratingSlow, setHydratingSlow] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [realtimeConnected, setRealtimeConnectedState] = useState(false);
  const hydrating = useRef(false);
  const pendingRefresh = useRef(false);
  const realtimeConnectedRef = useRef(false);
  const slowTimer = useRef<number | null>(null);

  const currentUserId = sessionUserId || state.currentUserId;

  const applyServerState = useCallback(
    (next: AppState, users?: User[]) => {
      const merged: AppState = {
        ...next,
        // Cookie consent stays device-local
        cookieConsent: state.cookieConsent,
      };
      setState(merged);
      if (users) setDirectoryUsers(users);
      cacheState(merged);
    },
    [state.cookieConsent]
  );

  const applyLinkedServices = useCallback(
    (linkedServices: StreamingServiceId[]) => {
      setState((s) => {
        const next = { ...s, linkedServices };
        cacheState(next);
        return next;
      });
      if (!sessionUserId) return;
      setDirectoryUsers((users) =>
        users.map((u) =>
          u.id === sessionUserId ? { ...u, linkedServices } : u
        )
      );
    },
    [sessionUserId]
  );

  const refreshFromServer = useCallback(async () => {
    if (!sessionUserId) return;
    if (hydrating.current) {
      // Don't drop link/unlink refreshes behind an in-flight poll.
      pendingRefresh.current = true;
      return;
    }
    hydrating.current = true;
    if (slowTimer.current) window.clearTimeout(slowTimer.current);
    slowTimer.current = window.setTimeout(() => setHydratingSlow(true), 3000);
    try {
      do {
        pendingRefresh.current = false;
        const result = await apiJson<{ state: AppState; users: User[] }>(
          "/api/me/state"
        );
        if (result.ok) {
          applyServerState(result.data.state, result.data.users);
          setServerHydrated(true);
        }
      } while (pendingRefresh.current);
    } finally {
      hydrating.current = false;
      if (slowTimer.current) {
        window.clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
      setHydratingSlow(false);
    }
  }, [sessionUserId, applyServerState]);

  // Initial: cache for instant paint, then server wins when signed in
  useEffect(() => {
    const cached = loadCachedState();
    setState(cached);
    setReady(true);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!sessionUserId) {
      setServerHydrated(false);
      setUnreadDmCount(0);
      // Guest: load public directory + parties for browse
      Promise.all([
        apiJson<{ users: User[] }>("/api/users"),
        apiJson<{ parties: WatchParty[] }>("/api/parties"),
      ]).then(([usersRes, partiesRes]) => {
        if (usersRes.ok) setDirectoryUsers(usersRes.data.users);
        setState((s) => ({
          ...s,
          currentUserId: "",
          parties: partiesRes.ok ? partiesRes.data.parties : s.parties,
        }));
      });
      return;
    }
    void refreshFromServer();
  }, [sessionUserId, sessionStatus, refreshFromServer]);

  // Light poll fallback — sockets handle party chat/playback/presence live.
  useEffect(() => {
    if (!sessionUserId) return;
    const ms = realtimeConnected ? 45_000 : 12_000;
    const id = window.setInterval(() => {
      void refreshFromServer();
    }, ms);
    return () => window.clearInterval(id);
  }, [sessionUserId, refreshFromServer, realtimeConnected]);

  // Unread DMs for nav badges (faster than full state hydrate)
  useEffect(() => {
    if (!sessionUserId) return;
    let cancelled = false;
    async function pollUnread() {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { unread?: number };
        if (typeof data.unread === "number") setUnreadDmCount(data.unread);
      } catch {
        /* ignore */
      }
    }
    void pollUnread();
    const id = window.setInterval(() => void pollUnread(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionUserId]);

  const setRealtimeConnected = useCallback((connected: boolean) => {
    realtimeConnectedRef.current = connected;
    setRealtimeConnectedState(connected);
  }, []);

  const applyPartyMessage = useCallback((message: PartyMessage) => {
    setState((s) => {
      if (s.partyMessages.some((m) => m.id === message.id)) return s;
      return { ...s, partyMessages: [...s.partyMessages, message] };
    });
  }, []);

  const applyPartyReaction = useCallback((reaction: PartyReaction) => {
    setState((s) => {
      if (s.partyReactions.some((r) => r.id === reaction.id)) return s;
      return { ...s, partyReactions: [...s.partyReactions, reaction] };
    });
  }, []);

  const applyPartyPlayback = useCallback((sync: PartyPlaybackSync) => {
    setState((s) => {
      const prev = s.partyPlaybackSync.find((p) => p.partyId === sync.partyId);
      const merged: PartyPlaybackSync = {
        ...prev,
        ...sync,
        watchStartedAt:
          sync.watchStartedAt !== undefined
            ? sync.watchStartedAt
            : prev?.watchStartedAt ?? null,
      };
      const rest = s.partyPlaybackSync.filter((p) => p.partyId !== sync.partyId);
      return { ...s, partyPlaybackSync: [...rest, merged] };
    });
  }, []);

  // Cache local prefs only when signed out; when signed in, cache after server hydrate
  useEffect(() => {
    if (!ready) return;
    cacheState(state);
  }, [state, ready]);

  const planDef = useMemo(() => getPlan(state.plan), [state.plan]);
  const canHostParties = planDef.limits.canHostParties;
  const watchlistLimit = planDef.limits.maxWatchlists;
  const linkedServiceLimit = planDef.limits.maxLinkedServices;

  const createWatchlist = useCallback(
    async (name: string, description = ""): Promise<CreateResult<Watchlist>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to create watchlists." };
      }
      const result = await apiJson<{ watchlist: Watchlist }>("/api/watchlists", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      if (!result.ok) return { ok: false, error: result.error };
      await refreshFromServer();
      return { ok: true, value: result.data.watchlist };
    },
    [sessionUserId, refreshFromServer]
  );

  const renameWatchlist = useCallback(
    (id: string, name: string, description?: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/watchlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const deleteWatchlist = useCallback(
    (id: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/watchlists/${id}`, { method: "DELETE" }).then(() =>
        refreshFromServer()
      );
    },
    [sessionUserId, refreshFromServer]
  );

  const togglePublic = useCallback(
    (id: string) => {
      if (!sessionUserId) return;
      const current = state.watchlists.find((w) => w.id === id);
      if (!current) return;
      void apiJson(`/api/watchlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic: !current.isPublic }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, state.watchlists, refreshFromServer]
  );

  const addToWatchlist = useCallback(
    (watchlistId: string, movieId: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        body: JSON.stringify({ addMovieId: movieId }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const removeFromWatchlist = useCallback(
    (watchlistId: string, movieId: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        body: JSON.stringify({ removeMovieId: movieId }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const setCurrentlyWatching = useCallback(
    (
      movieId: string | null,
      opts?: {
        serviceId?: StreamingServiceId | null;
        progressPercent?: number | null;
        startTracker?: boolean;
      }
    ) => {
      const nowIso = new Date().toISOString();
      setState((s) => {
        const titleChanged = Boolean(movieId && movieId !== s.currentlyWatchingId);
        const startTracker = Boolean(opts?.startTracker) || titleChanged;
        return {
          ...s,
          currentlyWatchingId: movieId,
          currentlyWatchingServiceId: movieId ? opts?.serviceId ?? null : null,
          watchingProgressPercent: movieId
            ? opts?.progressPercent !== undefined
              ? opts.progressPercent
              : titleChanged
                ? 0
                : s.watchingProgressPercent
            : null,
          watchingStartedAt: movieId
            ? startTracker
              ? nowIso
              : s.watchingStartedAt ?? nowIso
            : null,
        };
      });
      if (!sessionUserId) return;
      void apiJson("/api/presence", {
        method: "PATCH",
        body: JSON.stringify({
          movieId,
          serviceId: opts?.serviceId,
          progressPercent: opts?.progressPercent,
          startTracker: opts?.startTracker,
        }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const restartWatchingTracker = useCallback(() => {
    setState((s) => {
      if (!s.currentlyWatchingId) return s;
      return { ...s, watchingStartedAt: new Date().toISOString() };
    });
    if (!sessionUserId) return;
    void apiJson("/api/presence", {
      method: "PATCH",
      body: JSON.stringify({ startTracker: true }),
    }).then(() => refreshFromServer());
  }, [sessionUserId, refreshFromServer]);

  const setWatchingProgress = useCallback(
    (percent: number | null) => {
      setState((s) => ({
        ...s,
        watchingProgressPercent:
          percent === null
            ? null
            : Math.max(0, Math.min(100, Math.round(percent))),
      }));
      if (!sessionUserId) return;
      void apiJson("/api/presence", {
        method: "PATCH",
        body: JSON.stringify({ progressPercent: percent }),
      });
    },
    [sessionUserId]
  );

  const markFinished = useCallback(
    (movieId: string) => {
      setState((s) => ({
        ...s,
        currentlyWatchingId:
          s.currentlyWatchingId === movieId ? null : s.currentlyWatchingId,
        currentlyWatchingServiceId:
          s.currentlyWatchingId === movieId
            ? null
            : s.currentlyWatchingServiceId,
        watchingProgressPercent:
          s.currentlyWatchingId === movieId ? null : s.watchingProgressPercent,
        watchingStartedAt:
          s.currentlyWatchingId === movieId ? null : s.watchingStartedAt,
        recentlyWatchedIds: [
          movieId,
          ...s.recentlyWatchedIds.filter((id) => id !== movieId),
        ].slice(0, 12),
      }));
      if (!sessionUserId) return;
      void apiJson("/api/presence", {
        method: "PATCH",
        body: JSON.stringify({ finishedMovieId: movieId }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const setWatchingPublic = useCallback(
    (value: boolean) => {
      setState((s) => ({ ...s, watchingPublic: value }));
      if (!sessionUserId) return;
      void apiJson("/api/presence", {
        method: "PATCH",
        body: JSON.stringify({ publicWatching: value }),
      });
    },
    [sessionUserId]
  );

  const linkStreamingService = useCallback(
    async (serviceId: StreamingServiceId) => {
      if (!sessionUserId) {
        return { ok: false as const, error: "Sign in required" };
      }
      const result = await apiJson<{
        ok?: boolean;
        linkedServices?: StreamingServiceId[];
        error?: string;
      }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ linkService: serviceId }),
      });
      if (!result.ok) return { ok: false as const, error: result.error };
      if (result.data.linkedServices) {
        applyLinkedServices(result.data.linkedServices);
      }
      await refreshFromServer();
      return { ok: true as const };
    },
    [sessionUserId, refreshFromServer, applyLinkedServices]
  );

  const unlinkStreamingService = useCallback(
    async (serviceId: StreamingServiceId) => {
      if (!sessionUserId) {
        return { ok: false as const, error: "Sign in required" };
      }
      const result = await apiJson<{
        ok?: boolean;
        linkedServices?: StreamingServiceId[];
        error?: string;
      }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ unlinkService: serviceId }),
      });
      if (!result.ok) return { ok: false as const, error: result.error };
      if (result.data.linkedServices) {
        applyLinkedServices(result.data.linkedServices);
      }
      await refreshFromServer();
      return { ok: true as const };
    },
    [sessionUserId, refreshFromServer, applyLinkedServices]
  );

  const createParty = useCallback(
    async (input: {
      name: string;
      movieId: string;
      startsAt: string | null;
      isLive: boolean;
      serviceId?: StreamingServiceId | null;
      syncMode?: WatchParty["syncMode"];
      coHostIds?: string[];
      recurringWeekly?: boolean;
    }): Promise<CreateResult<WatchParty>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to host parties." };
      }
      const movie = getMovie(input.movieId);
      const syncMode =
        input.syncMode ||
        (movie?.youtubePlaybackId ||
        movie?.freePlaybackUrl ||
        movie?.archiveOrgId ||
        movie?.id?.startsWith("ia-")
          ? "watchify_free"
          : "own_account");
      const result = await apiJson<{ party: WatchParty }>("/api/parties", {
        method: "POST",
        body: JSON.stringify({ ...input, syncMode }),
      });
      if (!result.ok) return { ok: false, error: result.error };
      await refreshFromServer();
      return { ok: true, value: result.data.party };
    },
    [sessionUserId, refreshFromServer]
  );

  const endParty = useCallback(
    async (partyId: string) => {
      if (!sessionUserId) return;
      const result = await apiJson<{
        ok?: boolean;
        nextPartyId?: string;
        nextStartsAt?: string;
        error?: string;
      }>("/api/parties", {
        method: "POST",
        body: JSON.stringify({ endPartyId: partyId }),
      });
      await refreshFromServer();
      if (!result.ok) return;
      return {
        nextPartyId: result.data.nextPartyId,
        nextStartsAt: result.data.nextStartsAt,
      };
    },
    [sessionUserId, refreshFromServer]
  );

  const leaveParty = useCallback(
    async (partyId: string): Promise<CreateResult<true>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to leave a party." };
      }
      const result = await apiJson<{ ok?: boolean; error?: string }>(
        "/api/parties",
        {
          method: "POST",
          body: JSON.stringify({ action: "leave", partyId }),
        }
      );
      await refreshFromServer();
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, value: true };
    },
    [sessionUserId, refreshFromServer]
  );

  const removePartyMember = useCallback(
    async (
      partyId: string,
      targetUserId: string
    ): Promise<CreateResult<true>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to manage the party." };
      }
      const result = await apiJson<{ ok?: boolean; error?: string }>(
        "/api/parties",
        {
          method: "POST",
          body: JSON.stringify({
            action: "kick",
            partyId,
            targetUserId,
          }),
        }
      );
      await refreshFromServer();
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, value: true };
    },
    [sessionUserId, refreshFromServer]
  );

  const updateParty = useCallback(
    async (
      partyId: string,
      input: { name?: string; movieId?: string; coHostIds?: string[] }
    ): Promise<CreateResult<WatchParty>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to edit a party." };
      }
      const result = await apiJson<{ party?: WatchParty; error?: string }>(
        "/api/parties",
        {
          method: "POST",
          body: JSON.stringify({
            action: "update",
            partyId,
            name: input.name,
            updateMovieId: input.movieId,
            coHostIds: input.coHostIds,
          }),
        }
      );
      if (!result.ok || !result.data.party) {
        return {
          ok: false,
          error: result.ok
            ? result.data.error || "Update failed"
            : result.error,
        };
      }
      await refreshFromServer();
      return { ok: true, value: result.data.party };
    },
    [sessionUserId, refreshFromServer]
  );

  const requestJoinParty = useCallback(
    (partyId: string) => {
      if (!sessionUserId) return;
      void apiJson("/api/parties", {
        method: "POST",
        body: JSON.stringify({ action: "join", partyId }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const joinPartyByInvite = useCallback(
    async (invite: string): Promise<CreateResult<WatchParty>> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in to join via invite." };
      }
      const result = await apiJson<{
        ok?: boolean;
        party?: WatchParty;
        error?: string;
      }>("/api/parties", {
        method: "POST",
        body: JSON.stringify({ action: "join_invite", invite }),
      });
      if (!result.ok || !result.data.party) {
        return {
          ok: false,
          error: result.ok
            ? result.data.error || "Join failed"
            : result.error,
        };
      }
      await refreshFromServer();
      return { ok: true, value: result.data.party };
    },
    [sessionUserId, refreshFromServer]
  );

  const acceptJoinRequest = useCallback(
    (requestId: string) => {
      if (!sessionUserId) return;
      void apiJson("/api/parties/join-requests", {
        method: "POST",
        body: JSON.stringify({ requestId, action: "accept" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const declineJoinRequest = useCallback(
    (requestId: string) => {
      if (!sessionUserId) return;
      void apiJson("/api/parties/join-requests", {
        method: "POST",
        body: JSON.stringify({ requestId, action: "decline" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const postPartyMessage = useCallback(
    (partyId: string, text: string) => {
      const cleaned = sanitizeText(text, 280);
      if (!cleaned || !sessionUserId) return;
      const rt = getPartyRealtime(partyId);
      if (rt?.connected) {
        void rt.sendMessage(cleaned).then((message) => {
          if (message) applyPartyMessage(message);
          else {
            void apiJson(`/api/parties/${partyId}/messages`, {
              method: "POST",
              body: JSON.stringify({ text: cleaned }),
            }).then(() => refreshFromServer());
          }
        });
        return;
      }
      void apiJson(`/api/parties/${partyId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: cleaned }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer, applyPartyMessage]
  );

  const addPartyReaction = useCallback(
    (partyId: string, emoji: string) => {
      if (!sessionUserId) return;
      const rt = getPartyRealtime(partyId);
      if (rt?.connected) {
        void rt.sendReaction(emoji).then((reaction) => {
          if (reaction) applyPartyReaction(reaction);
          else {
            void apiJson(`/api/parties/${partyId}/messages`, {
              method: "POST",
              body: JSON.stringify({ emoji }),
            }).then(() => refreshFromServer());
          }
        });
        return;
      }
      void apiJson(`/api/parties/${partyId}/messages`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer, applyPartyReaction]
  );

  const updatePartyPlayback = useCallback(
    (
      partyId: string,
      positionSec: number,
      playing: boolean,
      opts?: { startTracker?: boolean }
    ) => {
      if (!sessionUserId) return;
      const startTracker = Boolean(opts?.startTracker);
      const nowIso = new Date().toISOString();
      // Optimistic local sync so FreePlayer feels instant for the host
      applyPartyPlayback({
        partyId,
        positionSec,
        playing,
        watchStartedAt: startTracker ? nowIso : undefined,
        updatedAt: nowIso,
        updatedBy: sessionUserId,
      });
      const rt = getPartyRealtime(partyId);
      if (rt?.connected) {
        void rt
          .sendPlayback(positionSec, playing, { startTracker })
          .then((sync) => {
            if (sync) applyPartyPlayback(sync);
          });
        return;
      }
      void apiJson(`/api/parties/${partyId}/messages`, {
        method: "POST",
        body: JSON.stringify({ positionSec, playing, startTracker }),
      });
    },
    [sessionUserId, applyPartyPlayback]
  );

  const startPartyWatchTracker = useCallback(
    (partyId: string, positionSec = 0) => {
      updatePartyPlayback(partyId, positionSec, true, { startTracker: true });
    },
    [updatePartyPlayback]
  );

  const sendFriendRequest = useCallback(
    (toUserId: string) => {
      if (!sessionUserId || toUserId === sessionUserId) return;
      void apiJson("/api/friends", {
        method: "POST",
        body: JSON.stringify({ toUserId }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const acceptFriendRequest = useCallback(
    (requestId: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/friends/requests/${requestId}`, {
        method: "POST",
        body: JSON.stringify({ action: "accept" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const declineFriendRequest = useCallback(
    (requestId: string) => {
      if (!sessionUserId) return;
      void apiJson(`/api/friends/requests/${requestId}`, {
        method: "POST",
        body: JSON.stringify({ action: "decline" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const setPlanLocal = useCallback(
    async (plan: PlanId) => {
      if (!sessionUserId) return;
      setState((s) => ({ ...s, plan }));
      await apiJson("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ plan }),
      });
      await refreshFromServer();
    },
    [sessionUserId, refreshFromServer]
  );

  const setSocialLinks = useCallback(
    async (
      links: Partial<SocialLinks>
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!sessionUserId) {
        return { ok: false, error: "Sign in required" };
      }
      const result = await apiJson<{ ok?: boolean; error?: string }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          socialLinks: { ...EMPTY_SOCIAL_LINKS, ...state.socialLinks, ...links },
        }),
      });
      if (!result.ok) return { ok: false, error: result.error };
      await refreshFromServer();
      return { ok: true };
    },
    [sessionUserId, state.socialLinks, refreshFromServer]
  );

  const blockUser = useCallback(
    (userId: string) => {
      if (!sessionUserId || userId === sessionUserId) return;
      void apiJson("/api/blocks", {
        method: "POST",
        body: JSON.stringify({ userId, action: "block" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const unblockUser = useCallback(
    (userId: string) => {
      if (!sessionUserId) return;
      void apiJson("/api/blocks", {
        method: "POST",
        body: JSON.stringify({ userId, action: "unblock" }),
      }).then(() => refreshFromServer());
    },
    [sessionUserId, refreshFromServer]
  );

  const setCookieConsent = useCallback((value: AppState["cookieConsent"]) => {
    setState((s) => ({ ...s, cookieConsent: value }));
  }, []);

  const setAgeConfirmed = useCallback(
    (value: boolean) => {
      setState((s) => ({ ...s, ageConfirmed: value }));
      if (!sessionUserId) return;
      void apiJson("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ ageConfirmed: value }),
      });
    },
    [sessionUserId]
  );

  const myWatchlists = useMemo(
    () => state.watchlists.filter((w) => w.ownerId === currentUserId),
    [state.watchlists, currentUserId]
  );

  const isFriend = useCallback(
    (userId: string) => state.friendIds.includes(userId),
    [state.friendIds]
  );

  const isBlocked = useCallback(
    (userId: string) => state.blockedUserIds.includes(userId),
    [state.blockedUserIds]
  );

  const blocked = useMemo(
    () => new Set(state.blockedUserIds),
    [state.blockedUserIds]
  );

  const feedActivities = useMemo(() => {
    const allowed = new Set([currentUserId, ...state.friendIds].filter(Boolean));
    return [...state.activities]
      .filter((a) => allowed.has(a.userId) && !blocked.has(a.userId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [state.activities, state.friendIds, blocked, currentUserId]);

  const openParties = useMemo(
    () =>
      state.parties
        .filter((p) => p.status === "open" && !blocked.has(p.hostId))
        .sort((a, b) => {
          if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
    [state.parties, blocked]
  );

  const myHostedJoinRequests = useMemo(() => {
    const myPartyIds = new Set(
      state.parties
        .filter(
          (p) =>
            p.status === "open" &&
            (p.hostId === currentUserId ||
              p.coHostIds?.includes(currentUserId))
        )
        .map((p) => p.id)
    );
    return state.partyJoinRequests.filter(
      (r) =>
        r.status === "pending" &&
        myPartyIds.has(r.partyId) &&
        !blocked.has(r.fromUserId)
    );
  }, [state.parties, state.partyJoinRequests, blocked, currentUserId]);

  const incomingFriendRequests = useMemo(
    () =>
      state.friendRequests.filter(
        (r) =>
          r.status === "pending" &&
          r.toUserId === currentUserId &&
          !blocked.has(r.fromUserId)
      ),
    [state.friendRequests, blocked, currentUserId]
  );

  const outgoingFriendRequests = useMemo(
    () =>
      state.friendRequests.filter(
        (r) => r.status === "pending" && r.fromUserId === currentUserId
      ),
    [state.friendRequests, currentUserId]
  );

  const publicWatching = useMemo(() => {
    const usersForPresence = directoryUsers;
    const rows: {
      userId: string;
      movieId: string;
      isFriend: boolean;
      serviceId?: StreamingServiceId | null;
      progressPercent?: number | null;
      watchingStartedAt?: string | null;
    }[] = [];
    for (const user of usersForPresence) {
      if (blocked.has(user.id)) continue;
      if (user.id === currentUserId) {
        if (state.currentlyWatchingId && state.watchingPublic) {
          rows.push({
            userId: user.id,
            movieId: state.currentlyWatchingId,
            isFriend: false,
            serviceId: state.currentlyWatchingServiceId,
            progressPercent: state.watchingProgressPercent,
            watchingStartedAt: state.watchingStartedAt,
          });
        }
        continue;
      }
      if (!user.currentlyWatchingId) continue;
      rows.push({
        userId: user.id,
        movieId: user.currentlyWatchingId,
        isFriend: state.friendIds.includes(user.id),
        serviceId: user.currentlyWatchingServiceId ?? null,
        progressPercent: user.watchingProgressPercent ?? null,
        watchingStartedAt: user.watchingStartedAt ?? null,
      });
    }
    return rows.sort((a, b) => Number(b.isFriend) - Number(a.isFriend));
  }, [
    directoryUsers,
    state.currentlyWatchingId,
    state.currentlyWatchingServiceId,
    state.watchingProgressPercent,
    state.watchingStartedAt,
    state.watchingPublic,
    state.friendIds,
    blocked,
    currentUserId,
  ]);

  const friendsWatching = useMemo(
    () => publicWatching.filter((r) => r.isFriend),
    [publicWatching]
  );

  const value = useMemo(
    () => ({
      ready,
      serverHydrated,
      hydratingSlow,
      unreadDmCount,
      state,
      directoryUsers,
      currentUserId,
      createWatchlist,
      renameWatchlist,
      deleteWatchlist,
      togglePublic,
      addToWatchlist,
      removeFromWatchlist,
      setCurrentlyWatching,
      restartWatchingTracker,
      setWatchingProgress,
      markFinished,
      setWatchingPublic,
      linkStreamingService,
      unlinkStreamingService,
      createParty,
      endParty,
      leaveParty,
      removePartyMember,
      updateParty,
      requestJoinParty,
      joinPartyByInvite,
      acceptJoinRequest,
      declineJoinRequest,
      postPartyMessage,
      addPartyReaction,
      updatePartyPlayback,
      startPartyWatchTracker,
      applyPartyMessage,
      applyPartyReaction,
      applyPartyPlayback,
      setRealtimeConnected,
      realtimeConnected,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      setPlanLocal,
      setSocialLinks,
      blockUser,
      unblockUser,
      setCookieConsent,
      setAgeConfirmed,
      refreshFromServer,
      myWatchlists,
      feedActivities,
      openParties,
      myHostedJoinRequests,
      incomingFriendRequests,
      outgoingFriendRequests,
      friendsWatching,
      publicWatching,
      isFriend,
      isBlocked,
      canHostParties,
      watchlistLimit,
      linkedServiceLimit,
    }),
    [
      ready,
      serverHydrated,
      hydratingSlow,
      unreadDmCount,
      state,
      directoryUsers,
      currentUserId,
      createWatchlist,
      renameWatchlist,
      deleteWatchlist,
      togglePublic,
      addToWatchlist,
      removeFromWatchlist,
      setCurrentlyWatching,
      restartWatchingTracker,
      setWatchingProgress,
      markFinished,
      setWatchingPublic,
      linkStreamingService,
      unlinkStreamingService,
      createParty,
      endParty,
      leaveParty,
      removePartyMember,
      updateParty,
      requestJoinParty,
      joinPartyByInvite,
      acceptJoinRequest,
      declineJoinRequest,
      postPartyMessage,
      addPartyReaction,
      updatePartyPlayback,
      startPartyWatchTracker,
      applyPartyMessage,
      applyPartyReaction,
      applyPartyPlayback,
      setRealtimeConnected,
      realtimeConnected,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      setPlanLocal,
      setSocialLinks,
      blockUser,
      unblockUser,
      setCookieConsent,
      setAgeConfirmed,
      refreshFromServer,
      myWatchlists,
      feedActivities,
      openParties,
      myHostedJoinRequests,
      incomingFriendRequests,
      outgoingFriendRequests,
      friendsWatching,
      publicWatching,
      isFriend,
      isBlocked,
      canHostParties,
      watchlistLimit,
      linkedServiceLimit,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWatchify() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWatchify must be used within WatchifyProvider");
  return ctx;
}
