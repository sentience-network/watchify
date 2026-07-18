"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acquirePartyRealtime, releasePartyRealtime, type PartyRealtimeClient,
  type PartySocketHandlers, type VideoPeer, type WebrtcSignal,
} from "@/lib/party-realtime";

export function usePartyVideo(partyId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peers, setPeers] = useState<Map<string, VideoPeer>>(new Map());
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [turnConfigured, setTurnConfigured] = useState(false);
  const clientRef = useRef<PartyRealtimeClient | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const localRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);
  const iceRef = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);

  const closePeer = useCallback((userId: string) => {
    pcs.current.get(userId)?.close();
    pcs.current.delete(userId);
    setRemoteStreams((current) => { const next = new Map(current); next.delete(userId); return next; });
    setPeers((current) => { const next = new Map(current); next.delete(userId); return next; });
  }, []);

  const makePeer = useCallback((userId: string) => {
    const existing = pcs.current.get(userId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    pcs.current.set(userId, pc);
    localRef.current?.getTracks().forEach((track) => pc.addTrack(track, localRef.current!));
    pc.onicecandidate = (event) => {
      if (event.candidate) clientRef.current?.sendWebrtcSignal(userId, { type: "ice", candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((current) => new Map(current).set(userId, stream));
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) closePeer(userId);
    };
    return pc;
  }, [closePeer]);

  const initiate = useCallback(async (peer: VideoPeer) => {
    setPeers((current) => new Map(current).set(peer.userId, peer));
    const pc = makePeer(peer.userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    clientRef.current?.sendWebrtcSignal(peer.userId, { type: "offer", sdp: offer });
  }, [makePeer]);

  const handleSignal = useCallback(async (fromUserId: string, signal: WebrtcSignal) => {
    try {
      const pc = makePeer(fromUserId);
      if (signal.type === "offer") {
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        clientRef.current?.sendWebrtcSignal(fromUserId, { type: "answer", sdp: answer });
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(signal.sdp);
      } else {
        await pc.addIceCandidate(signal.candidate);
      }
    } catch {
      setError("A peer connection dropped; reconnecting may help.");
    }
  }, [makePeer]);

  const handlers = useMemo<PartySocketHandlers>(() => ({
    onVideoPeerJoined: (peer) => setPeers((current) => new Map(current).set(peer.userId, peer)),
    onVideoPeerLeft: closePeer,
    onWebrtcSignal: handleSignal,
    onConnectionChange: (connected) => {
      if (!connected) {
        for (const id of Array.from(pcs.current.keys())) closePeer(id);
      } else if (joinedRef.current && clientRef.current) {
        const camera = Boolean(localRef.current?.getVideoTracks().some((track) => track.enabled));
        const microphone = Boolean(localRef.current?.getAudioTracks().some((track) => track.enabled));
        void clientRef.current.joinVideo(camera, microphone).then((list) => Promise.all(list.map(initiate))).catch(() => setError("Video signaling reconnect failed."));
      }
    },
  }), [closePeer, handleSignal, initiate]);

  useEffect(() => {
    let cancelled = false;
    const peerConnections = pcs.current;
    void fetch("/api/realtime/ice").then((res) => res.json()).then((data) => {
      iceRef.current = data.iceServers || iceRef.current;
      setTurnConfigured(Boolean(data.turnConfigured));
    }).catch(() => undefined);
    void acquirePartyRealtime(partyId, handlers).then((client) => {
      if (cancelled) releasePartyRealtime(partyId, handlers);
      else clientRef.current = client;
    });
    return () => {
      cancelled = true;
      joinedRef.current = false;
      clientRef.current?.leaveVideo();
      for (const pc of Array.from(peerConnections.values())) pc.close();
      peerConnections.clear();
      localRef.current?.getTracks().forEach((track) => track.stop());
      releasePartyRealtime(partyId, handlers);
    };
  }, [partyId, handlers]);

  const join = useCallback(async (camera: boolean, microphone: boolean) => {
    setError("");
    try {
      const stream = camera || microphone
        ? await navigator.mediaDevices.getUserMedia({ video: camera, audio: microphone })
        : new MediaStream();
      localRef.current = stream;
      setLocalStream(stream);
      localStorage.setItem("watchify_video_defaults", JSON.stringify({ camera, microphone }));
      const existing = await clientRef.current?.joinVideo(camera, microphone);
      joinedRef.current = true;
      setJoined(true);
      await Promise.all((existing || []).map(initiate));
    } catch (reason) {
      localRef.current?.getTracks().forEach((track) => track.stop());
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Camera or microphone permission was denied. You can join with both off."
        : reason instanceof Error ? reason.message : "Could not join video.");
    }
  }, [initiate]);

  const leave = useCallback(() => {
    clientRef.current?.leaveVideo();
    joinedRef.current = false;
    setJoined(false);
    for (const pc of Array.from(pcs.current.values())) pc.close();
    pcs.current.clear();
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeers(new Map());
  }, []);

  const toggle = useCallback(async (kind: "camera" | "microphone") => {
    let track = kind === "camera" ? localRef.current?.getVideoTracks()[0] : localRef.current?.getAudioTracks()[0];
    if (!track) {
      try {
        const added = await navigator.mediaDevices.getUserMedia({
          video: kind === "camera", audio: kind === "microphone",
        });
        track = added.getTracks()[0];
        if (!track) return false;
        if (!localRef.current) localRef.current = new MediaStream();
        localRef.current.addTrack(track);
        setLocalStream(new MediaStream(localRef.current.getTracks()));
        for (const [userId, pc] of Array.from(pcs.current.entries())) {
          pc.addTrack(track, localRef.current);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          clientRef.current?.sendWebrtcSignal(userId, { type: "offer", sdp: offer });
        }
      } catch {
        setError("Browser permission is required to enable this device.");
        return false;
      }
    } else {
      track.enabled = !track.enabled;
    }
    const camera = Boolean(localRef.current?.getVideoTracks().some((item) => item.enabled));
    const microphone = Boolean(localRef.current?.getAudioTracks().some((item) => item.enabled));
    clientRef.current?.updateVideoState(camera, microphone);
    localStorage.setItem("watchify_video_defaults", JSON.stringify({ camera, microphone }));
    return Boolean(track.enabled);
  }, []);

  const shareScreen = useCallback(async () => {
    setError("");
    if (!joinedRef.current) {
      setError("Join the video room first, then share your screen with the party.");
      return false;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen share is not supported in this browser.");
      return false;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const track = display.getVideoTracks()[0];
      if (!track) return false;
      if (!localRef.current) localRef.current = new MediaStream();
      // Replace camera video with screen, or add as primary video track.
      const oldVideo = localRef.current.getVideoTracks()[0];
      if (oldVideo) {
        oldVideo.stop();
        localRef.current.removeTrack(oldVideo);
      }
      localRef.current.addTrack(track);
      display.getAudioTracks().forEach((t) => localRef.current!.addTrack(t));
      setLocalStream(new MediaStream(localRef.current.getTracks()));
      for (const [userId, pc] of Array.from(pcs.current.entries())) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
        else pc.addTrack(track, localRef.current);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        clientRef.current?.sendWebrtcSignal(userId, { type: "offer", sdp: offer });
      }
      track.addEventListener("ended", () => {
        void (async () => {
          // Screen share stopped from browser UI — leave video track empty.
          if (localRef.current) {
            localRef.current.getVideoTracks().forEach((t) => {
              if (t === track) localRef.current?.removeTrack(t);
            });
            setLocalStream(new MediaStream(localRef.current.getTracks()));
          }
          clientRef.current?.updateVideoState(false, Boolean(localRef.current?.getAudioTracks().some((t) => t.enabled)));
        })();
      });
      clientRef.current?.updateVideoState(true, Boolean(localRef.current.getAudioTracks().some((t) => t.enabled)));
      return true;
    } catch {
      setError("Screen share canceled or denied. Paid streamer windows must not be shared.");
      return false;
    }
  }, []);

  return { localStream, remoteStreams, peers, joined, error, turnConfigured, join, leave, toggle, shareScreen };
}
