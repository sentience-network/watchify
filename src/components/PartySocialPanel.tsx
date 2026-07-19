"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  STREAMING_HONEST_COPY,
  getStreamingService,
  openOnServiceUrl,
  whereToWatchUrl,
} from "@/lib/streaming";
import { formatPlayhead } from "@/lib/deep-links";
import { getMovie } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import { usePartyRealtime } from "@/hooks/usePartyRealtime";
import { getPartyRealtime } from "@/lib/party-realtime";
import { FreePlayer } from "./FreePlayer";
import { ProviderDeepLinks, ScrubToTimeBanner } from "./ScrubToTimeBanner";
import { ServiceBadge } from "./ServiceBadge";
import { InviteFriendsInApp } from "./InviteFriendsInApp";
import { ShareMenu } from "./ShareMenu";
import { partyInviteUrl } from "@/lib/social-graph";

const REACTIONS = ["🔥", "😂", "😱", "👏", "❤️"];

export function PartySocialPanel({ partyId }: { partyId: string }) {
  const {
    state,
    postPartyMessage,
    addPartyReaction,
    updatePartyPlayback,
    ready,
    currentUserId,
  } = useWatchify();
  const [text, setText] = useState("");
  const [fly, setFly] = useState<string | null>(null);
  const typingTimer = useRef<number | null>(null);

  const party = state.parties.find((p) => p.id === partyId);
  const isMember = Boolean(
    party &&
      (party.memberIds.includes(currentUserId) ||
        party.hostId === currentUserId ||
        party.coHostIds?.includes(currentUserId))
  );

  const { presence, live } = usePartyRealtime(partyId, ready && isMember);

  const movie = party ? getMovie(party.movieId) : undefined;
  const host = party ? getUser(party.hostId) : undefined;
  const service = getStreamingService(party?.serviceId);
  const sync = state.partyPlaybackSync.find((p) => p.partyId === partyId);
  const mode = party?.syncMode || "social";
  const free = isFreePlayable(movie);
  const positionSec = sync?.positionSec || 0;

  const preferredDeepLink = useMemo(() => {
    if (!movie) return null;
    if (party?.serviceId) {
      const match = movie.providers?.find((p) => p.id === party.serviceId);
      if (match) return match;
      const svc = getStreamingService(party.serviceId);
      if (svc) {
        return {
          id: party.serviceId,
          name: svc.name,
          deepLink: openOnServiceUrl(party.serviceId, movie.title),
          titleSpecific: false as boolean,
        };
      }
    }
    return movie.providers?.[0] || null;
  }, [movie, party?.serviceId]);

  const messages = useMemo(
    () =>
      state.partyMessages
        .filter((m) => m.partyId === partyId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [state.partyMessages, partyId]
  );

  const reactions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of state.partyReactions.filter((x) => x.partyId === partyId)) {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [state.partyReactions, partyId]);

  const typingOthers = presence.filter(
    (m) => m.typing && m.userId !== currentUserId
  );

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      getPartyRealtime(partyId)?.setTyping(false);
    };
  }, [partyId]);

  if (!ready || !party || !movie) return null;

  function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    postPartyMessage(partyId, text);
    setText("");
    getPartyRealtime(partyId)?.setTyping(false);
  }

  function onType(value: string) {
    setText(value);
    const rt = getPartyRealtime(partyId);
    if (!rt?.connected) return;
    rt.setTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      rt.setTyping(false);
    }, 1200);
  }

  const inviteUrl =
    typeof window !== "undefined"
      ? partyInviteUrl(party.id, undefined, { inviteCode: party.inviteCode })
      : "";

  return (
    <div className="mt-3 rounded-xl border border-line/80 bg-ink/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-teal">
          {mode === "watchify_free"
            ? "Watchify free sync"
            : mode === "own_account"
              ? "Own-account sync"
              : "Social sync"}
        </p>
        <div className="flex items-center gap-2">
          {inviteUrl ? (
            <ShareMenu
              compact
              url={inviteUrl}
              title={`Join ${party.name} on Watchify`}
              text={`Join the Watchify party for ${movie.title}`}
            />
          ) : null}
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              live ? "bg-teal/20 text-teal-soft" : "bg-panel text-mist/60"
            }`}
          >
            {live ? "Live" : "Reconnecting…"}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-mist/70">
        {mode === "watchify_free"
          ? "Everyone plays the free Watchify file together — real synced playback."
          : mode === "own_account"
            ? "Teleparty-style: each person opens the title on their own account. We sync playhead hints + chat — never your password or stream."
            : "Chat and reactions only. Not a shared video stream."}{" "}
        {STREAMING_HONEST_COPY}
      </p>

      {inviteUrl ? (
        <div className="mt-3 border-t border-line/60 pt-3">
          <InviteFriendsInApp
            inviteUrl={inviteUrl}
            partyName={party.name}
            movieTitle={movie.title}
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mist">
        <span>
          {party.memberIds.length} members ·{" "}
          {presence.length ? `${presence.length} online` : "waiting for presence"}{" "}
          · host {host?.name}
          {service ? (
            <>
              {" "}
              on <ServiceBadge serviceId={service.id} />
            </>
          ) : null}
        </span>
        {preferredDeepLink && !free ? (
          <a
            href={preferredDeepLink.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-teal/15 px-2 py-1 font-medium text-teal-soft hover:underline"
          >
            Open movie on {preferredDeepLink.name}
          </a>
        ) : null}
        <a
          href={whereToWatchUrl(movie.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mist/80 hover:text-teal-soft"
        >
          Where to watch
        </a>
        {free ? (
          <Link
            href={`/watch/${movie.id}?party=${partyId}`}
            className="font-medium text-teal-soft hover:underline"
          >
            Open free player (auto-seek)
          </Link>
        ) : null}
      </div>

      {(mode === "own_account" || mode === "social") && preferredDeepLink ? (
        <ScrubToTimeBanner
          serviceName={preferredDeepLink.name}
          deepLink={preferredDeepLink.deepLink}
          positionSec={positionSec}
        />
      ) : null}

      {mode === "own_account" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel/40 p-2 text-xs text-mist">
          <span>
            Live playhead: {formatPlayhead(positionSec)} ·{" "}
            {sync?.playing ? "playing" : "paused"}
          </span>
          <button
            type="button"
            className="rounded-md bg-teal/20 px-2 py-1 text-teal-soft"
            onClick={() => updatePartyPlayback(partyId, positionSec + 10, true)}
          >
            +10s (host hint)
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-2 py-1"
            onClick={() => updatePartyPlayback(partyId, positionSec, false)}
          >
            Pause hint
          </button>
        </div>
      ) : null}

      {movie.providers && movie.providers.length > 0 && !free ? (
        <div className="mt-3">
          <ProviderDeepLinks providers={movie.providers} label="Open on service" />
        </div>
      ) : null}

      {mode === "watchify_free" && free ? (
        <div className="mt-3">
          <FreePlayer movieId={movie.id} partyId={partyId} />
        </div>
      ) : null}

      {presence.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {presence.map((m) => (
            <li
              key={m.userId}
              className="rounded-md border border-line/70 bg-panel/50 px-2 py-0.5 text-[11px] text-mist"
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              {m.name}
              {m.typing ? " · typing…" : ""}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              addPartyReaction(partyId, emoji);
              setFly(emoji);
              setTimeout(() => setFly(null), 900);
            }}
            className="relative rounded-md border border-line px-2 py-1 text-sm hover:bg-white/5"
          >
            {emoji}
          </button>
        ))}
        {fly ? (
          <span className="pointer-events-none text-xl animate-react-fly" aria-hidden>
            {fly}
          </span>
        ) : null}
        {reactions.map(([emoji, count]) => (
          <span key={emoji} className="rounded-md bg-panel px-2 py-1 text-xs text-mist">
            {emoji} {count}
          </span>
        ))}
      </div>

      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
        {messages.map((m) => {
          const u = getUser(m.userId);
          return (
            <li key={m.id} className="text-mist">
              <span className="font-medium text-white">{u?.name || "Someone"}</span>: {m.text}
            </li>
          );
        })}
        {!messages.length ? (
          <li className="text-xs text-mist/60">No chat yet — say hi.</li>
        ) : null}
      </ul>

      {typingOthers.length > 0 ? (
        <p className="mt-1 text-[11px] text-mist/55">
          {typingOthers.map((t) => t.name).join(", ")} typing…
        </p>
      ) : null}

      <form onSubmit={onSend} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder="Party chat (live across browsers)…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
        />
        <button type="submit" className="rounded-lg bg-teal/20 px-3 py-2 text-xs font-semibold text-teal-soft">
          Send
        </button>
      </form>
    </div>
  );
}
