"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  notificationPermission,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/browser-notify";
import { getMovie } from "@/lib/movies";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import { useToasts } from "./ToastStack";

type ConversationRow = {
  id: string;
  unread: boolean;
  lastMessage: {
    id: string;
    text: string;
    linkUrl?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
  otherUser: { id: string; name: string };
};

function partyInviteFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "https://watchify.app"
    );
    const m = u.pathname.match(/\/share\/party\/([^/]+)/);
    if (m) return m[1];
    if (u.pathname.startsWith("/parties")) {
      return (
        u.searchParams.get("invite") ||
        u.searchParams.get("join") ||
        u.searchParams.get("joined")
      );
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Fast in-app toasts for party invites + friend went live / started watching.
 * Optional browser Notification when permission is granted.
 */
export function SocialAlerts() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { pushToast } = useToasts();
  const { ready, currentUserId, friendsWatching, openParties, state } =
    useWatchify();

  const seenInviteMsg = useRef<Set<string>>(new Set());
  const seenWatching = useRef<Map<string, string>>(new Map());
  const seenLiveParty = useRef<Set<string>>(new Set());
  const invitesReady = useRef(false);
  const socialReady = useRef(false);
  const notifyAsked = useRef(false);

  useEffect(() => {
    if (!session?.user || notifyAsked.current) return;
    if (notificationPermission() !== "default") return;
    notifyAsked.current = true;
    const t = window.setTimeout(() => {
      void requestNotificationPermission();
    }, 12_000);
    return () => window.clearTimeout(t);
  }, [session?.user]);

  // Party invite DMs — poll faster than the 8–12s state hydrate
  useEffect(() => {
    if (!session?.user || !currentUserId) return;

    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { conversations: ConversationRow[] };
        for (const c of data.conversations || []) {
          const msg = c.lastMessage;
          if (!msg || !c.unread) continue;
          if (msg.senderId === currentUserId) continue;
          const invite = partyInviteFromUrl(msg.linkUrl);
          const looksInvite =
            Boolean(invite) ||
            /watchify party|join my watchify/i.test(msg.text || "");
          if (!looksInvite) continue;
          if (seenInviteMsg.current.has(msg.id)) continue;
          seenInviteMsg.current.add(msg.id);
          if (!invitesReady.current) continue;
          if (pathname?.startsWith("/messages")) continue;

          const href = invite
            ? `/share/party/${encodeURIComponent(invite)}`
            : `/messages?c=${encodeURIComponent(c.id)}`;
          pushToast({
            id: `invite_${msg.id}`,
            title: `${c.otherUser.name} invited you`,
            body: msg.text.slice(0, 120),
            href,
            cta: "Join party",
          });
          showBrowserNotification(`${c.otherUser.name} invited you`, {
            body: msg.text.slice(0, 120),
            tag: `invite_${msg.id}`,
            url: href,
          });
        }
        invitesReady.current = true;
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session?.user, currentUserId, pathname, pushToast]);

  // Friend started watching / went live with a party
  useEffect(() => {
    if (!ready || !currentUserId) return;

    if (!socialReady.current) {
      for (const row of friendsWatching) {
        seenWatching.current.set(row.userId, row.movieId);
      }
      for (const party of openParties) {
        if (party.isLive && state.friendIds.includes(party.hostId)) {
          seenLiveParty.current.add(party.id);
        }
      }
      socialReady.current = true;
      return;
    }

    for (const row of friendsWatching) {
      const prev = seenWatching.current.get(row.userId);
      if (prev === row.movieId) continue;
      seenWatching.current.set(row.userId, row.movieId);
      if (prev === undefined) continue;

      const user = getUser(row.userId);
      const movie = getMovie(row.movieId);
      const title = `${user?.name || "Friend"} started watching`;
      const body = movie ? movie.title : "Something new";
      const href = `/share/watching/${row.userId}`;
      pushToast({
        id: `watch_${row.userId}_${row.movieId}`,
        title,
        body,
        href,
        cta: "Jump in",
      });
      showBrowserNotification(title, {
        body,
        tag: `watch_${row.userId}`,
        url: href,
      });
    }

    for (const party of openParties) {
      if (!party.isLive) continue;
      if (party.hostId === currentUserId) continue;
      if (!state.friendIds.includes(party.hostId)) continue;
      if (seenLiveParty.current.has(party.id)) continue;
      seenLiveParty.current.add(party.id);

      const host = getUser(party.hostId);
      const movie = getMovie(party.movieId);
      const title = `${host?.name || "Friend"} went live`;
      const body = movie ? `${party.name} · ${movie.title}` : party.name;
      const href = `/parties?joined=${encodeURIComponent(party.id)}`;
      pushToast({
        id: `live_${party.id}`,
        title,
        body,
        href,
        cta: "Open party",
      });
      showBrowserNotification(title, {
        body,
        tag: `live_${party.id}`,
        url: href,
      });
    }
  }, [
    ready,
    currentUserId,
    friendsWatching,
    openParties,
    state.friendIds,
    pushToast,
  ]);

  return null;
}
