"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acquirePartyRealtime,
  releasePartyRealtime,
  type PartyCountdownEvent,
  type PartySocketHandlers,
} from "@/lib/party-realtime";
import { useWatchify } from "@/lib/store";
import type { PartyPresenceMember } from "@/lib/types";

/**
 * Connects to the Socket.io room for a party while mounted.
 * Multiple callers share one connection via refcount.
 */
export function usePartyRealtime(partyId: string, enabled: boolean) {
  const {
    applyPartyMessage,
    applyPartyReaction,
    applyPartyPlayback,
    setRealtimeConnected,
  } = useWatchify();
  const [presence, setPresence] = useState<PartyPresenceMember[]>([]);
  const [live, setLive] = useState(false);
  const [countdown, setCountdown] = useState<PartyCountdownEvent | null>(null);

  const handlers = useMemo<PartySocketHandlers>(
    () => ({
      onJoined: (data) => {
        setPresence(data.members);
        if (data.playback) applyPartyPlayback(data.playback);
      },
      onMessage: (message) => applyPartyMessage(message),
      onReaction: (reaction) => applyPartyReaction(reaction),
      onPlayback: (sync) => applyPartyPlayback(sync),
      onPresence: (members) => setPresence(members),
      onCountdown: (event) => setCountdown(event),
      onTyping: (userId, typing) => {
        setPresence((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, typing } : m))
        );
      },
      onConnectionChange: (connected) => {
        setLive(connected);
        setRealtimeConnected(connected);
      },
    }),
    [
      applyPartyMessage,
      applyPartyReaction,
      applyPartyPlayback,
      setRealtimeConnected,
    ]
  );

  useEffect(() => {
    if (!enabled || !partyId) {
      setLive(false);
      setPresence([]);
      setCountdown(null);
      return;
    }

    let cancelled = false;
    void acquirePartyRealtime(partyId, handlers).then(() => {
      if (cancelled) releasePartyRealtime(partyId, handlers);
    });

    return () => {
      cancelled = true;
      releasePartyRealtime(partyId, handlers);
      setLive(false);
      setPresence([]);
      setCountdown(null);
    };
  }, [partyId, enabled, handlers]);

  return {
    presence,
    live,
    countdown,
    clearCountdown: () => setCountdown(null),
  };
}
