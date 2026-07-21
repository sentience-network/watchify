"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acquirePartyRealtime,
  releasePartyRealtime,
  type PartyCountdownEvent,
  type PartyNextVote,
  type PartySocketHandlers,
  type VideoPeer,
} from "@/lib/party-realtime";
import { playPartySound } from "@/lib/party-sounds";
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
    refreshFromServer,
    currentUserId,
  } = useWatchify();
  const [presence, setPresence] = useState<PartyPresenceMember[]>([]);
  const [videoPeers, setVideoPeers] = useState<VideoPeer[]>([]);
  const [live, setLive] = useState(false);
  const [countdown, setCountdown] = useState<PartyCountdownEvent | null>(null);
  const [nextVote, setNextVote] = useState<PartyNextVote | null>(null);
  const [kicked, setKicked] = useState(false);

  const handlers = useMemo<PartySocketHandlers>(
    () => ({
      onJoined: (data) => {
        setPresence(data.members);
        setVideoPeers(data.videoPeers || []);
        setNextVote(data.nextVote ?? null);
        if (data.playback) applyPartyPlayback(data.playback);
      },
      onMessage: (message) => applyPartyMessage(message),
      onReaction: (reaction) => {
        applyPartyReaction(reaction);
        if (reaction.userId !== currentUserId) playPartySound("reaction");
      },
      onPlayback: (sync) => applyPartyPlayback(sync),
      onPresence: (members) => setPresence(members),
      onCountdown: (event) => {
        setCountdown(event);
        playPartySound("countdown");
      },
      onNextVote: (vote) => setNextVote(vote),
      onMemberOnline: (userId) => {
        if (userId !== currentUserId) playPartySound("join");
      },
      onMemberKicked: (userId) => {
        if (userId === currentUserId) {
          setKicked(true);
          void refreshFromServer();
        } else {
          void refreshFromServer();
        }
      },
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
      refreshFromServer,
      currentUserId,
    ]
  );

  useEffect(() => {
    if (!enabled || !partyId) {
      setLive(false);
      setPresence([]);
      setVideoPeers([]);
      setCountdown(null);
      setNextVote(null);
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
      setNextVote(null);
    };
  }, [partyId, enabled, handlers]);

  // Countdown tick sounds
  useEffect(() => {
    if (!countdown) return;
    const started = new Date(countdown.startedAt).getTime();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, countdown.seconds - elapsed);
      if (left > 0 && left <= countdown.seconds) playPartySound("countdown");
      if (left <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  return {
    presence,
    videoPeers,
    live,
    countdown,
    clearCountdown: () => setCountdown(null),
    nextVote,
    kicked,
  };
}
