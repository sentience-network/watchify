"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openNativeIosScreenShareStream } from "@/lib/ios-screen-share";
import {
  acquirePartyRealtime, releasePartyRealtime, type PartyRealtimeClient,
  type PartySocketHandlers, type VideoPeer, type WebrtcSignal,
} from "@/lib/party-realtime";

/** Best-effort display-capture constraints (system audio when the browser allows). */
function displayMediaConstraints(): DisplayMediaStreamOptions {
  return {
    video: {
      frameRate: { ideal: 30, max: 30 },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    } as MediaTrackConstraints,
    audio: true,
    // Chromium extensions — ignored when unsupported.
    ...({
      systemAudio: "include",
      selfBrowserSurface: "include",
      preferCurrentTab: false,
      surfaceSwitching: "include",
    } as Record<string, unknown>),
  };
}

function isDisplayTrack(track: MediaStreamTrack): boolean {
  try {
    const surface = (
      track.getSettings() as MediaTrackSettings & { displaySurface?: string }
    ).displaySurface;
    if (surface) return true;
  } catch {
    /* ignore */
  }
  const label = (track.label || "").toLowerCase();
  return (
    label.includes("screen") ||
    label.includes("display") ||
    label.includes("window") ||
    label.includes("tab") ||
    label.includes("web contents")
  );
}

export function usePartyVideo(partyId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  /** Optional face cam kept while screen is primary (local PiP only). */
  const [facePreviewStream, setFacePreviewStream] = useState<MediaStream | null>(
    null
  );
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peers, setPeers] = useState<Map<string, VideoPeer>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, string>>(
    new Map()
  );
  const [joined, setJoined] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [error, setError] = useState("");
  const [turnConfigured, setTurnConfigured] = useState(false);
  const clientRef = useRef<PartyRealtimeClient | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const localRef = useRef<MediaStream | null>(null);
  const faceCamTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenAudioTracksRef = useRef<MediaStreamTrack[]>([]);
  const nativeScreenStopRef = useRef<(() => Promise<void>) | null>(null);
  const joinedRef = useRef(false);
  const sharingRef = useRef(false);
  const iceRef = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  /** Resolves once /api/realtime/ice has applied (or failed) so joins use TURN when available. */
  const iceReadyRef = useRef<Promise<void>>(Promise.resolve());

  const publishState = useCallback(() => {
    const camera = Boolean(
      localRef.current?.getVideoTracks().some((track) => track.enabled)
    );
    const microphone = Boolean(
      localRef.current?.getAudioTracks().some((track) => track.enabled)
    );
    clientRef.current?.updateVideoState(camera, microphone, sharingRef.current);
  }, []);

  const closePeer = useCallback((userId: string) => {
    pcs.current.get(userId)?.close();
    pcs.current.delete(userId);
    setRemoteStreams((current) => {
      const next = new Map(current);
      next.delete(userId);
      return next;
    });
    setPeers((current) => {
      const next = new Map(current);
      next.delete(userId);
      return next;
    });
    setConnectionStates((current) => {
      const next = new Map(current);
      next.delete(userId);
      return next;
    });
  }, []);

  const makePeer = useCallback(
    (userId: string) => {
      const existing = pcs.current.get(userId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      pcs.current.set(userId, pc);
      localRef.current?.getTracks().forEach((track) =>
        pc.addTrack(track, localRef.current!)
      );
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          clientRef.current?.sendWebrtcSignal(userId, {
            type: "ice",
            candidate: event.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((current) => new Map(current).set(userId, stream));
      };
      pc.onconnectionstatechange = () => {
        setConnectionStates((current) =>
          new Map(current).set(userId, pc.connectionState)
        );
        if (["failed", "closed"].includes(pc.connectionState)) {
          closePeer(userId);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed"
        ) {
          setConnectionStates((current) =>
            new Map(current).set(
              userId,
              pc.iceConnectionState === "failed" ? "failed" : "reconnecting"
            )
          );
        }
      };
      setConnectionStates((current) =>
        new Map(current).set(userId, pc.connectionState || "connecting")
      );
      return pc;
    },
    [closePeer]
  );

  const initiate = useCallback(async (peer: VideoPeer) => {
    await iceReadyRef.current;
    setPeers((current) => new Map(current).set(peer.userId, peer));
    const pc = makePeer(peer.userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    clientRef.current?.sendWebrtcSignal(peer.userId, { type: "offer", sdp: offer });
  }, [makePeer]);

  const handleSignal = useCallback(async (fromUserId: string, signal: WebrtcSignal) => {
    try {
      await iceReadyRef.current;
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
        void clientRef.current
          .joinVideo(camera, microphone, sharingRef.current)
          .then((list) => Promise.all(list.map(initiate)))
          .catch(() => setError("Video signaling reconnect failed."));
      }
    },
  }), [closePeer, handleSignal, initiate]);

  useEffect(() => {
    let cancelled = false;
    const peerConnections = pcs.current;
    iceReadyRef.current = fetch("/api/realtime/ice")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        iceRef.current = data.iceServers || iceRef.current;
        setTurnConfigured(Boolean(data.turnConfigured));
      })
      .catch(() => undefined);
    void acquirePartyRealtime(partyId, handlers).then((client) => {
      if (cancelled) releasePartyRealtime(partyId, handlers);
      else clientRef.current = client;
    });
    return () => {
      cancelled = true;
      joinedRef.current = false;
      sharingRef.current = false;
      clientRef.current?.leaveVideo();
      for (const pc of Array.from(peerConnections.values())) pc.close();
      peerConnections.clear();
      localRef.current?.getTracks().forEach((track) => track.stop());
      faceCamTrackRef.current?.stop();
      faceCamTrackRef.current = null;
      screenTrackRef.current = null;
      screenAudioTracksRef.current = [];
      const nativeStop = nativeScreenStopRef.current;
      nativeScreenStopRef.current = null;
      void nativeStop?.();
      releasePartyRealtime(partyId, handlers);
    };
  }, [partyId, handlers]);

  const syncLocalStream = useCallback(() => {
    if (!localRef.current) {
      setLocalStream(null);
      return;
    }
    setLocalStream(new MediaStream(localRef.current.getTracks()));
  }, []);

  const join = useCallback(async (camera: boolean, microphone: boolean) => {
    setError("");
    try {
      await iceReadyRef.current;
      const stream = camera || microphone
        ? await navigator.mediaDevices.getUserMedia({ video: camera, audio: microphone })
        : new MediaStream();
      localRef.current = stream;
      setLocalStream(stream);
      localStorage.setItem("watchify_video_defaults", JSON.stringify({ camera, microphone }));
      const existing = await clientRef.current?.joinVideo(camera, microphone, false);
      joinedRef.current = true;
      setJoined(true);
      await Promise.all((existing || []).map(initiate));
      return true;
    } catch (reason) {
      localRef.current?.getTracks().forEach((track) => track.stop());
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Camera or microphone permission was denied. You can join with both off."
        : reason instanceof Error ? reason.message : "Could not join video.");
      return false;
    }
  }, [initiate]);

  const leave = useCallback(() => {
    clientRef.current?.leaveVideo();
    joinedRef.current = false;
    sharingRef.current = false;
    setJoined(false);
    setSharingScreen(false);
    for (const pc of Array.from(pcs.current.values())) pc.close();
    pcs.current.clear();
    const nativeStop = nativeScreenStopRef.current;
    nativeScreenStopRef.current = null;
    void nativeStop?.();
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    faceCamTrackRef.current?.stop();
    faceCamTrackRef.current = null;
    screenTrackRef.current = null;
    screenAudioTracksRef.current = [];
    setFacePreviewStream(null);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeers(new Map());
    setConnectionStates(new Map());
  }, []);

  const replaceVideoSender = useCallback(async (track: MediaStreamTrack | null) => {
    for (const [userId, pc] of Array.from(pcs.current.entries())) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(track);
      } else if (track && localRef.current) {
        pc.addTrack(track, localRef.current);
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      clientRef.current?.sendWebrtcSignal(userId, { type: "offer", sdp: offer });
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const nativeStop = nativeScreenStopRef.current;
    nativeScreenStopRef.current = null;
    if (nativeStop) {
      try {
        await nativeStop();
      } catch {
        /* ignore */
      }
    }
    const screen = screenTrackRef.current;
    if (screen) {
      try {
        screen.stop();
      } catch {
        /* ignore */
      }
      localRef.current?.getVideoTracks().forEach((t) => {
        if (t === screen) localRef.current?.removeTrack(t);
      });
    }
    for (const audio of screenAudioTracksRef.current) {
      try {
        audio.stop();
      } catch {
        /* ignore */
      }
      localRef.current?.getAudioTracks().forEach((t) => {
        if (t === audio) localRef.current?.removeTrack(t);
      });
    }
    screenTrackRef.current = null;
    screenAudioTracksRef.current = [];
    sharingRef.current = false;
    setSharingScreen(false);
    setFacePreviewStream(null);

    const face = faceCamTrackRef.current;
    if (face && face.readyState === "live") {
      if (!localRef.current) localRef.current = new MediaStream();
      if (!localRef.current.getVideoTracks().includes(face)) {
        localRef.current.addTrack(face);
      }
      face.enabled = true;
      await replaceVideoSender(face);
    } else {
      await replaceVideoSender(null);
    }
    faceCamTrackRef.current = null;
    syncLocalStream();
    publishState();
  }, [publishState, replaceVideoSender, syncLocalStream]);

  const toggle = useCallback(async (kind: "camera" | "microphone") => {
    if (kind === "camera" && sharingRef.current) {
      setError("Stop screen share first to switch back to camera as the main feed.");
      return false;
    }
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
        syncLocalStream();
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
    publishState();
    const camera = Boolean(localRef.current?.getVideoTracks().some((item) => item.enabled));
    const microphone = Boolean(localRef.current?.getAudioTracks().some((item) => item.enabled));
    localStorage.setItem("watchify_video_defaults", JSON.stringify({ camera, microphone }));
    return Boolean(track.enabled);
  }, [publishState, syncLocalStream]);

  const publishScreenTracks = useCallback(
    async (track: MediaStreamTrack, audioTracks: MediaStreamTrack[]) => {
      if (!localRef.current) localRef.current = new MediaStream();

      // Park face cam for optional local PiP; peers get screen as the primary video.
      const oldVideo = localRef.current.getVideoTracks()[0];
      if (oldVideo && !isDisplayTrack(oldVideo)) {
        faceCamTrackRef.current = oldVideo;
        localRef.current.removeTrack(oldVideo);
        oldVideo.enabled = true;
        setFacePreviewStream(new MediaStream([oldVideo]));
      } else if (oldVideo) {
        oldVideo.stop();
        localRef.current.removeTrack(oldVideo);
      }

      localRef.current.addTrack(track);
      screenTrackRef.current = track;

      screenAudioTracksRef.current = audioTracks;
      audioTracks.forEach((t) => localRef.current!.addTrack(t));

      sharingRef.current = true;
      setSharingScreen(true);
      syncLocalStream();

      for (const [userId, pc] of Array.from(pcs.current.entries())) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
        else pc.addTrack(track, localRef.current);
        for (const audio of audioTracks) {
          const hasAudio = pc.getSenders().some((s) => s.track === audio);
          if (!hasAudio) pc.addTrack(audio, localRef.current);
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        clientRef.current?.sendWebrtcSignal(userId, { type: "offer", sdp: offer });
      }

      track.addEventListener("ended", () => {
        void stopScreenShare();
      });

      publishState();
    },
    [publishState, stopScreenShare, syncLocalStream]
  );

  const shareScreen = useCallback(async () => {
    setError("");
    if (!joinedRef.current) {
      setError("Join the video room first, then share your screen with the party.");
      return false;
    }
    const hasDisplayMedia =
      typeof navigator.mediaDevices?.getDisplayMedia === "function";

    // Prefer web getDisplayMedia when present (Android Chrome / desktop).
    // On iOS Safari it is absent — fall through to native ReplayKit bridge.
    if (!hasDisplayMedia) {
      try {
        const native = await openNativeIosScreenShareStream();
        nativeScreenStopRef.current = native.stop;
        const track = native.stream.getVideoTracks()[0];
        if (!track) {
          await native.stop();
          nativeScreenStopRef.current = null;
          setError("iOS screen share started but no video track was produced.");
          return false;
        }
        try {
          track.contentHint = "detail";
        } catch {
          /* ignore */
        }
        await publishScreenTracks(track, native.stream.getAudioTracks());
        return true;
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Screen share is not available in this browser. On iPhone/iPad, open the Watchify iOS app, or host from Android Chrome / desktop / TV."
        );
        return false;
      }
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia(
        displayMediaConstraints()
      );
      const track = display.getVideoTracks()[0];
      if (!track) return false;
      try {
        track.contentHint = "detail";
      } catch {
        /* ignore */
      }
      await publishScreenTracks(track, display.getAudioTracks());
      return true;
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "NotAllowedError") {
        setError(
          "Screen share permission denied or canceled. Allow capture when prompted — Watchify only relays your host screen, it does not proxy TikTok/Netflix CDNs."
        );
      } else if (reason instanceof DOMException && reason.name === "NotSupportedError") {
        setError(
          "Screen share is not supported on this device. Use camera share, upload a video, or host from Android Chrome / desktop / TV."
        );
      } else if (reason instanceof DOMException && reason.name === "NotFoundError") {
        setError("No screen or tab was available to share. Try again and pick a surface.");
      } else {
        setError(
          reason instanceof Error
            ? reason.message
            : "Screen share canceled or denied."
        );
      }
      return false;
    }
  }, [publishScreenTracks]);

  const reconnectVideo = useCallback(async () => {
    setError("");
    if (!joinedRef.current) {
      setError("Join the video room first.");
      return false;
    }
    for (const id of Array.from(pcs.current.keys())) closePeer(id);
    try {
      const camera = Boolean(
        localRef.current?.getVideoTracks().some((t) => t.enabled)
      );
      const microphone = Boolean(
        localRef.current?.getAudioTracks().some((t) => t.enabled)
      );
      const list = await clientRef.current?.joinVideo(
        camera,
        microphone,
        sharingRef.current
      );
      await Promise.all((list || []).map(initiate));
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not reconnect video peers."
      );
      return false;
    }
  }, [closePeer, initiate]);

  return {
    localStream,
    facePreviewStream,
    remoteStreams,
    peers,
    connectionStates,
    joined,
    sharingScreen,
    error,
    turnConfigured,
    join,
    leave,
    toggle,
    shareScreen,
    stopScreenShare,
    reconnectVideo,
  };
}
