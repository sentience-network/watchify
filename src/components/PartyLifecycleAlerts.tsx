"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PartyRecapCard,
  type PartyRecap,
} from "@/components/PartyRecapCard";
import {
  clearPartySnapshot,
  rememberPartySnapshot,
} from "@/lib/party-recap-session";
import { notifyAllows, loadNotifyPrefs } from "@/lib/notify-prefs";
import { getMovie } from "@/lib/movies";
import { useWatchify } from "@/lib/store";
import { showBrowserNotification } from "@/lib/browser-notify";
import { useToasts } from "./ToastStack";
import type { WatchParty } from "@/lib/types";

/**
 * - Remembers party snapshots for joiner recaps
 * - In-app (+ optional browser) reminders ~1h before / when going live
 * - Surfaces shareable recap when a room you were in ends
 */
export function PartyLifecycleAlerts() {
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToasts();
  const {
    ready,
    currentUserId,
    openParties,
    createParty,
    canHostParties,
  } = useWatchify();

  const [recap, setRecap] = useState<PartyRecap | null>(null);
  const tracked = useRef<Map<string, WatchParty>>(new Map());
  const reminded1h = useRef<Set<string>>(new Set());
  const remindedLive = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  function isInParty(p: WatchParty) {
    if (!currentUserId) return false;
    return (
      p.hostId === currentUserId ||
      p.memberIds.includes(currentUserId) ||
      Boolean(p.coHostIds?.includes(currentUserId))
    );
  }

  // Snapshot + detect ended rooms for joiners
  useEffect(() => {
    if (!ready || !currentUserId) return;

    const openIds = new Set(openParties.map((p) => p.id));

    if (!bootstrapped.current) {
      for (const p of openParties) {
        if (isInParty(p)) {
          tracked.current.set(p.id, p);
          rememberPartySnapshot(p);
        }
      }
      bootstrapped.current = true;
      return;
    }

    for (const p of openParties) {
      if (isInParty(p)) {
        tracked.current.set(p.id, p);
        rememberPartySnapshot(p);
      }
    }

    for (const [id, snap] of Array.from(tracked.current.entries())) {
      if (openIds.has(id)) continue;
      tracked.current.delete(id);
      // Host on parties list / focus page may already show recap — still OK for joiners
      const onFocus = pathname === `/parties/${id}`;
      const onList = pathname === "/parties" || pathname?.startsWith("/parties?");
      if (snap.hostId === currentUserId && (onFocus || onList)) {
        clearPartySnapshot(id);
        continue;
      }
      if (!isInParty(snap) && snap.hostId !== currentUserId) {
        // was never in — skip
        continue;
      }
      // Joiner (or host elsewhere): show recap once
      if (!recap) {
        setRecap({
          party: snap,
          endedAt: new Date().toISOString(),
        });
      }
      clearPartySnapshot(id);
    }
  }, [ready, currentUserId, openParties, pathname, recap]);

  // 1h / going-live reminders
  useEffect(() => {
    if (!ready || !currentUserId) return;

    const tick = () => {
      const prefs = loadNotifyPrefs();
      if (!notifyAllows("reminder", prefs)) return;
      const now = Date.now();

      for (const party of openParties) {
        if (!isInParty(party)) continue;
        const movie = getMovie(party.movieId);
        const href = `/parties/${party.id}`;

        if (party.isLive) {
          if (remindedLive.current.has(party.id)) continue;
          // Only toast “went live” if we previously knew it as scheduled
          const prev = tracked.current.get(party.id);
          if (prev && !prev.isLive) {
            remindedLive.current.add(party.id);
            const title = `${party.name} is live`;
            const body = movie
              ? `${movie.title} — jump into the room`
              : "Your Watchify party started";
            pushToast({
              id: `remind_live_${party.id}`,
              title,
              body,
              href,
              cta: "Open room",
            });
            showBrowserNotification(title, {
              body,
              tag: `remind_live_${party.id}`,
              url: href,
            });
          } else {
            remindedLive.current.add(party.id);
          }
          continue;
        }

        if (!party.startsAt) continue;
        const start = new Date(party.startsAt).getTime();
        const msLeft = start - now;
        if (msLeft <= 0 || msLeft > 60 * 60 * 1000) continue;
        if (reminded1h.current.has(party.id)) continue;
        reminded1h.current.add(party.id);
        const mins = Math.max(1, Math.round(msLeft / 60_000));
        const title = `Party in ~${mins} min`;
        const body = movie
          ? `${party.name} · ${movie.title}`
          : party.name;
        pushToast({
          id: `remind_1h_${party.id}`,
          title,
          body,
          href,
          cta: "Open room",
        });
        showBrowserNotification(title, {
          body,
          tag: `remind_1h_${party.id}`,
          url: href,
        });
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [ready, currentUserId, openParties, pushToast]);

  async function sameTimeNextWeek(from: PartyRecap) {
    if (!canHostParties) return;
    if (from.nextPartyId) {
      router.push(`/parties/${from.nextPartyId}`);
      setRecap(null);
      return;
    }
    const base = from.party.startsAt
      ? new Date(from.party.startsAt)
      : new Date();
    const next = new Date(base.getTime() + 7 * 86_400_000);
    const result = await createParty({
      name: from.party.name,
      movieId: from.party.movieId,
      startsAt: next.toISOString(),
      isLive: false,
      serviceId: from.party.serviceId,
      syncMode: from.party.syncMode,
      coHostIds: from.party.coHostIds,
      recurringWeekly: true,
    });
    if (!result.ok) return;
    setRecap(null);
    router.push(`/parties/${result.value.id}`);
  }

  if (!recap) return null;

  return (
    <PartyRecapCard
      recap={recap}
      canHost={canHostParties}
      onSameTimeNextWeek={() => void sameTimeNextWeek(recap)}
      onClose={() => setRecap(null)}
    />
  );
}
