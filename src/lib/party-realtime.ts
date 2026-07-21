"use client";

import { io, type Socket } from "socket.io-client";
import type {
  PartyMessage,
  PartyPlaybackSync,
  PartyPresenceMember,
  PartyReaction,
} from "./types";

export type PartyCountdownEvent = {
  partyId: string;
  seconds: number;
  scrubSec: number;
  startedAt: string;
  startedBy: string;
};

export type PartySocketHandlers = {
  onJoined?: (data: {
    partyId: string;
    members: PartyPresenceMember[];
    playback: PartyPlaybackSync | null;
  }) => void;
  onMessage?: (message: PartyMessage) => void;
  onReaction?: (reaction: PartyReaction) => void;
  onPlayback?: (sync: PartyPlaybackSync) => void;
  onPresence?: (members: PartyPresenceMember[]) => void;
  onTyping?: (userId: string, typing: boolean) => void;
  onCountdown?: (event: PartyCountdownEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (message: string) => void;
  onVideoPeerJoined?: (peer: VideoPeer) => void;
  onVideoPeerLeft?: (userId: string) => void;
  onWebrtcSignal?: (fromUserId: string, signal: WebrtcSignal) => void;
};

export type VideoPeer = { userId: string; name: string; camera: boolean; microphone: boolean };
export type WebrtcSignal =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type TokenResponse = {
  token: string;
  url: string;
  partyId: string;
};

type SharedRoom = {
  client: PartyRealtimeClient;
  refs: number;
};

/** One Socket.io connection per party, shared across panels/players. */
const rooms = new Map<string, SharedRoom>();

export function getPartyRealtime(partyId: string) {
  return rooms.get(partyId)?.client ?? null;
}

export function isPartyRealtimeLive(partyId: string) {
  return Boolean(rooms.get(partyId)?.client.connected);
}

/** Acquire a shared room client (refcount). Call release when unmounting. */
export async function acquirePartyRealtime(
  partyId: string,
  handlers: PartySocketHandlers
): Promise<PartyRealtimeClient> {
  let shared = rooms.get(partyId);
  if (!shared) {
    const client = new PartyRealtimeClient();
    shared = { client, refs: 0 };
    rooms.set(partyId, shared);
  }
  shared.refs += 1;
  shared.client.addHandlers(handlers);
  if (!shared.client.connected && !shared.client.connecting) {
    void shared.client.connect(partyId);
  }
  return shared.client;
}

export function releasePartyRealtime(
  partyId: string,
  handlers: PartySocketHandlers
) {
  const shared = rooms.get(partyId);
  if (!shared) return;
  shared.client.removeHandlers(handlers);
  shared.refs -= 1;
  if (shared.refs <= 0) {
    shared.client.disconnect();
    rooms.delete(partyId);
  }
}

export class PartyRealtimeClient {
  private socket: Socket | null = null;
  private partyId: string | null = null;
  private handlerSet = new Set<PartySocketHandlers>();
  connected = false;
  connecting = false;

  addHandlers(handlers: PartySocketHandlers) {
    this.handlerSet.add(handlers);
  }

  removeHandlers(handlers: PartySocketHandlers) {
    this.handlerSet.delete(handlers);
  }

  private emitAll<K extends keyof PartySocketHandlers>(
    key: K,
    ...args: Parameters<NonNullable<PartySocketHandlers[K]>>
  ) {
    Array.from(this.handlerSet).forEach((h) => {
      const fn = h[key] as
        | ((...a: Parameters<NonNullable<PartySocketHandlers[K]>>) => void)
        | undefined;
      if (fn) fn(...args);
    });
  }

  async connect(partyId: string): Promise<boolean> {
    if (this.socket && this.partyId === partyId && this.socket.connected) {
      return true;
    }
    if (this.connecting && this.partyId === partyId) {
      return false;
    }
    this.disconnectSocketOnly();
    this.partyId = partyId;
    this.connecting = true;

    const res = await fetch("/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId }),
    });
    if (!res.ok) {
      this.connecting = false;
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      this.emitAll("onError", data.error || "Could not get realtime token");
      this.emitAll("onConnectionChange", false);
      return false;
    }
    const data = (await res.json()) as TokenResponse;

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        this.connecting = false;
        resolve(ok);
      };

      const socket = io(data.url, {
        path: "/socket.io",
        auth: { token: data.token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1200,
        reconnectionAttempts: 12,
      });
      this.socket = socket;

      const failTimer = window.setTimeout(() => {
        if (!this.connected) {
          this.emitAll(
            "onError",
            "Realtime server unreachable — using HTTP fallback"
          );
          this.emitAll("onConnectionChange", false);
          finish(false);
        }
      }, 4000);

      socket.on("connect", () => {
        this.connected = true;
        this.emitAll("onConnectionChange", true);
      });

      socket.on("joined", (payload) => {
        window.clearTimeout(failTimer);
        this.connected = true;
        this.connecting = false;
        this.emitAll("onConnectionChange", true);
        this.emitAll("onJoined", payload);
        finish(true);
      });

      socket.on("message", (payload: { message: PartyMessage }) => {
        if (payload?.message) this.emitAll("onMessage", payload.message);
      });
      socket.on("reaction", (payload: { reaction: PartyReaction }) => {
        if (payload?.reaction) this.emitAll("onReaction", payload.reaction);
      });
      socket.on("playback", (payload: { sync: PartyPlaybackSync }) => {
        if (payload?.sync) this.emitAll("onPlayback", payload.sync);
      });
      socket.on(
        "presence",
        (payload: { members: PartyPresenceMember[] }) => {
          this.emitAll("onPresence", payload.members || []);
        }
      );
      socket.on("typing", (payload: { userId: string; typing: boolean }) => {
        this.emitAll("onTyping", payload.userId, payload.typing);
      });
      socket.on("countdown", (payload: PartyCountdownEvent) => {
        if (payload?.partyId) this.emitAll("onCountdown", payload);
      });
      socket.on("video_peer_joined", (payload: { peer: VideoPeer }) => {
        if (payload?.peer) this.emitAll("onVideoPeerJoined", payload.peer);
      });
      socket.on("video_peer_left", (payload: { userId: string }) => {
        if (payload?.userId) this.emitAll("onVideoPeerLeft", payload.userId);
      });
      socket.on("webrtc_signal", (payload: { fromUserId: string; signal: WebrtcSignal }) => {
        if (payload?.fromUserId && payload?.signal) this.emitAll("onWebrtcSignal", payload.fromUserId, payload.signal);
      });
      socket.on("error_msg", (payload: { message?: string }) => {
        this.emitAll("onError", payload.message || "Realtime error");
      });
      socket.on("disconnect", () => {
        this.connected = false;
        this.emitAll("onConnectionChange", false);
      });
      socket.on("connect_error", () => {
        this.connected = false;
        this.emitAll("onConnectionChange", false);
      });
    });
  }

  private disconnectSocketOnly() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.connecting = false;
  }

  disconnect() {
    this.disconnectSocketOnly();
    this.partyId = null;
    this.handlerSet.clear();
  }

  sendMessage(text: string): Promise<PartyMessage | null> {
    return this.emitAck("message", { text });
  }

  sendReaction(emoji: string): Promise<PartyReaction | null> {
    return this.emitAck("reaction", { emoji });
  }

  sendPlayback(
    positionSec: number,
    playing: boolean,
    opts?: { startTracker?: boolean }
  ): Promise<PartyPlaybackSync | null> {
    return this.emitAck("playback", {
      positionSec,
      playing,
      startTracker: Boolean(opts?.startTracker),
    });
  }

  setTyping(typing: boolean) {
    this.socket?.emit("typing", { typing });
  }

  /** Host own-account 3–2–1 Go. */
  sendCountdown(
    seconds: number,
    scrubSec: number
  ): Promise<PartyCountdownEvent | null> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      socket
        .timeout(5000)
        .emit(
          "countdown",
          { seconds, scrubSec },
          (
            err: Error | null,
            res?: { ok?: boolean; event?: PartyCountdownEvent }
          ) => {
            if (err || !res?.ok || !res.event) {
              resolve(null);
              return;
            }
            resolve(res.event);
          }
        );
    });
  }

  joinVideo(camera: boolean, microphone: boolean): Promise<VideoPeer[]> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      socket.timeout(5000).emit("video_join", { camera, microphone }, (err: Error | null, response?: { ok: boolean; peers?: VideoPeer[]; error?: string }) => {
        if (err || !response?.ok) reject(new Error(response?.error || "Video room unavailable"));
        else resolve(response.peers || []);
      });
    });
  }

  leaveVideo() {
    this.socket?.emit("video_leave");
  }

  sendWebrtcSignal(targetUserId: string, signal: WebrtcSignal) {
    this.socket?.emit("webrtc_signal", { targetUserId, signal });
  }

  updateVideoState(camera: boolean, microphone: boolean) {
    this.socket?.emit("video_state", { camera, microphone });
  }

  private emitAck<T>(event: string, payload: unknown): Promise<T | null> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      socket
        .timeout(5000)
        .emit(
          event,
          payload,
          (
            err: Error | null,
            res?: {
              ok?: boolean;
              message?: T;
              reaction?: T;
              sync?: T;
            }
          ) => {
            if (err || !res?.ok) {
              resolve(null);
              return;
            }
            resolve(
              (res.message || res.reaction || res.sync || null) as T | null
            );
          }
        );
    });
  }
}
