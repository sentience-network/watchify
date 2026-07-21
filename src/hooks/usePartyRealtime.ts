"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acquirePartyRealtime,
  releasePartyRealtime,
  type PartyCountdownEvent,
  type PartySocketHandlers,
  type VideoPeer,
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
  const [videoPeers, setVideoPeers] = useState<VideoPeer[]>([]);
  const [live, setLive] = useState(false);
  const [countdown, setCountdown] = useState<PartyCountdownEvent | null>(null);

  const handlers = useMemo<PartySocketHandlers>(
    () => ({
      onJoined: (data) => {
        setPresence(data.members);
        setVideoPeers(data.videoPeers || []);
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
      onVideoPeerJoined: (peer) => {
        setVideoPeers((prev) => {
          const next = prev.filter((p) => p.userId !== peer.userId);
          next.push(peer);
          return next;
        });
      },
      onVideoPeerLeft: (userId) => {
        setVideoPeers((prev) => prev.filter((p) => p.userId !== userId));
      },
      onConnectionChange: (connected) => {
        setLive(connected);
        setRealtimeConnected(connected);
        if (!connected) setVideoPeers([]);
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
      setVideoPeers([]);
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
      setVideoPeers([]);
      setCountdown(null);
    };
  }, [partyId, enabled, handlers]);

  return {
    presence,
    videoPeers,
    live,
    countdown,
    clearCountdown: () => setCountdown(null),
  };
}
