"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  STREAMING_HONEST_COPY,
  getStreamingService,
  openOnServiceUrl,
  whereToWatchUrl,
} from "@/lib/streaming";
import {
  formatPlayhead,
  formatWatchStartedAt,
  suggestedJoinPlayheadSec,
} from "@/lib/deep-links";
import { getMovie } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { useWatchify } from "@/lib/store";
import { partyUserLabel } from "@/lib/users";
import { usePartyRealtime } from "@/hooks/usePartyRealtime";
import { getPartyRealtime } from "@/lib/party-realtime";
import { FreePlayer } from "./FreePlayer";
import { ProviderDeepLinks, ScrubToTimeBanner } from "./ScrubToTimeBanner";
import { ServiceBadge } from "./ServiceBadge";
import { InviteFriendsInApp } from "./InviteFriendsInApp";
import { ShareMenu } from "./ShareMenu";
import { partyInviteUrl } from "@/lib/social-graph";
import { HostLobbyChecklist } from "./HostLobbyChecklist";
import { PartyCountdownOverlay } from "./PartyCountdownOverlay";

const REACTIONS = ["🔥", "😂", "😱", "👏", "❤️"];

export function PartySocialPanel({
  partyId,
  theater = false,
}: {
  partyId: string;
  /** Sticky player + chat stack for focus / phone theater. */
  theater?: boolean;
}) {
  const {
    state,
    postPartyMessage,
    addPartyReaction,
    updatePartyPlayback,
    startPartyWatchTracker,
    ready,
    currentUserId,
    directoryUsers,
    refreshFromServer,
  } = useWatchify();
  const [text, setText] = useState("");
  const [fly, setFly] = useState<string | null>(null);
  const [joinTick, setJoinTick] = useState(0);
  const [countdownLeft, setCountdownLeft] = useState(0);
  const [countdownScrub, setCountdownScrub] = useState(0);
  const typingTimer = useRef<number | null>(null);
  const countdownFired = useRef(false);

  const party = state.parties.find((p) => p.id === partyId);
  const isMember = Boolean(
    party &&
      (party.memberIds.includes(currentUserId) ||
        party.hostId === currentUserId ||
        party.coHostIds?.includes(currentUserId))
  );

  const { presence, videoPeers, live, countdown, clearCountdown } =
    usePartyRealtime(partyId, ready && isMember);

  const movie = party ? getMovie(party.movieId) : undefined;
  const hostLabel = party
    ? partyUserLabel(party.hostId, directoryUsers)
    : undefined;
  const service = getStreamingService(party?.serviceId);
  const sync = state.partyPlaybackSync.find((p) => p.partyId === partyId);
  const mode = party?.syncMode || "social";
  const free = isFreePlayable(movie);
  const positionSec = sync?.positionSec || 0;
  const isHostOrCo =
    party?.hostId === currentUserId ||
    Boolean(party?.coHostIds?.includes(currentUserId));
  const joinCueSec = useMemo(
    () =>
      suggestedJoinPlayheadSec(
        sync?.watchStartedAt,
        positionSec,
        Boolean(sync?.playing)
      ),
    [sync?.watchStartedAt, positionSec, sync?.playing, joinTick]
  );

  useEffect(() => {
    if (!sync?.watchStartedAt || !sync.playing) return;
    const id = window.setInterval(() => setJoinTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [sync?.watchStartedAt, sync?.playing]);

  // Own-account Ready? 3–2–1 Go overlay
  useEffect(() => {
    if (!countdown) {
      setCountdownLeft(0);
      countdownFired.current = false;
      return;
    }
    countdownFired.current = false;
    const started = new Date(countdown.startedAt).getTime();
    setCountdownScrub(countdown.scrubSec);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, countdown.seconds - elapsed);
      setCountdownLeft(left);
      if (left <= 0 && !countdownFired.current) {
        countdownFired.current = true;
        clearCountdown();
        if (isHostOrCo && mode === "own_account") {
          startPartyWatchTracker(partyId, countdown.scrubSec);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [
    countdown,
    clearCountdown,
    isHostOrCo,
    mode,
    partyId,
    startPartyWatchTracker,
  ]);

  async function startReadyGo() {
    const scrub = joinCueSec || positionSec || 0;
    const rt = getPartyRealtime(partyId);
    if (rt?.connected) {
      const event = await rt.sendCountdown(3, scrub);
      if (event) return;
    }
    // HTTP-less fallback: local overlay + start tracker after 3s
    setCountdownScrub(scrub);
    setCountdownLeft(3);
    let n = 3;
    const id = window.setInterval(() => {
      n -= 1;
      setCountdownLeft(n);
      if (n <= 0) {
        window.clearInterval(id);
        startPartyWatchTracker(partyId, scrub);
      }
    }, 1000);
  }

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
          deepLink: openOnServiceUrl(party.serviceId, movie.title, movie.year),
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
    <div
      className={`mt-3 rounded-xl border border-line/80 bg-ink/40 p-3 ${
        theater ? "party-theater-panel md:static" : ""
      }`}
    >
      <PartyCountdownOverlay count={countdownLeft} scrubSec={countdownScrub} />
      {isHostOrCo && party ? (
        <HostLobbyChecklist
          party={party}
          onGoLive={() => void refreshFromServer()}
        />
      ) : null}
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
          · host {hostLabel?.name}
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
        <div className="mt-3 space-y-2 rounded-lg border border-amber/30 bg-amber/10 p-3 text-xs text-mist">
          <p className="font-medium text-amber-soft">
            Off-site watch tracker
          </p>
          <p className="leading-relaxed text-mist/75">
            Press play on your own service (Netflix, Max, etc.), then start the
            tracker. Friends see when you started and what time to scrub to —
            Watchify never streams those apps.
          </p>
          {sync?.watchStartedAt ? (
            <div className="rounded-md border border-line/70 bg-ink/40 px-2.5 py-2 text-white">
              <p>
                Started at{" "}
                <span className="font-semibold text-teal-soft">
                  {formatWatchStartedAt(sync.watchStartedAt)}
                </span>
                {" · "}
                join / scrub to{" "}
                <span className="font-semibold text-teal-soft">
                  {formatPlayhead(joinCueSec)}
                </span>
              </p>
              <p className="mt-0.5 text-mist/65">
                Host playhead hint: {formatPlayhead(positionSec)} ·{" "}
                {sync.playing ? "playing" : "paused"}
              </p>
            </div>
          ) : (
            <p className="text-mist/70">Tracker not started yet.</p>
          )}
          {isHostOrCo ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-amber px-3 py-1.5 font-semibold text-ink"
                onClick={() => void startReadyGo()}
                disabled={countdownLeft > 0}
              >
                Ready? 3–2–1 Go
              </button>
              <button
                type="button"
                className="rounded-md bg-teal px-3 py-1.5 font-semibold text-ink"
                onClick={() => startPartyWatchTracker(partyId, 0)}
              >
                {sync?.watchStartedAt
                  ? "Restart tracker (I pressed play)"
                  : "I pressed play — start tracker"}
              </button>
              <button
                type="button"
                className="rounded-md bg-teal/20 px-2 py-1 text-teal-soft"
                onClick={() =>
                  updatePartyPlayback(partyId, positionSec + 10, true)
                }
              >
                +10s hint
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
        </div>
      ) : null}

      {movie.providers && movie.providers.length > 0 && !free ? (
        <div className="mt-3">
          <ProviderDeepLinks
            providers={movie.providers.filter(
              (p) => !p.kind || p.kind === "stream"
            )}
            label="Open on service"
            mode="stream"
          />
        </div>
      ) : null}

      {mode === "watchify_free" && free ? (
        <div
          className={`mt-3 ${
            theater
              ? "sticky top-0 z-20 -mx-1 rounded-lg bg-ink/95 pb-2 pt-1 backdrop-blur md:static md:bg-transparent md:pb-0 md:pt-0"
              : ""
          }`}
        >
          <FreePlayer movieId={movie.id} partyId={partyId} />
        </div>
      ) : null}

      {presence.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {presence.map((m) => {
            const label = partyUserLabel(m.userId, directoryUsers, m);
            return (
              <li
                key={m.userId}
                className="rounded-md border border-line/70 bg-panel/50 px-2 py-0.5 text-[11px] text-mist"
              >
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-teal" />
                {label.name}
                {label.handle ? (
                  <span className="text-mist/55"> @{label.handle}</span>
                ) : null}
                {m.typing ? " · typing…" : ""}
              </li>
            );
          })}
        </ul>
      ) : null}

      {videoPeers.length > 0 ? (
        <p className="mt-2 text-[11px] text-mist/75">
          <span className="font-medium text-teal-soft">On video:</span>{" "}
          {videoPeers
            .map((p) =>
              partyUserLabel(p.userId, directoryUsers, { name: p.name }).name
            )
            .join(", ")}
        </p>
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

      <ul
        className={`mt-3 space-y-2 overflow-y-auto text-sm ${
          theater ? "max-h-[28vh] md:max-h-48" : "max-h-40"
        }`}
      >
        {messages.map((m) => {
          const author = partyUserLabel(m.userId, directoryUsers);
          return (
            <li key={m.id} className="text-mist">
              <span className="font-medium text-white">{author.name}</span>
              {author.handle ? (
                <span className="text-mist/55"> @{author.handle}</span>
              ) : null}
              : {m.text}
            </li>
          );
        })}
        {!messages.length ? (
          <li className="text-xs text-mist/60">No chat yet — say hi.</li>
        ) : null}
      </ul>

      {typingOthers.length > 0 ? (
        <p className="mt-1 text-[11px] text-mist/55">
          {typingOthers
            .map((t) => partyUserLabel(t.userId, directoryUsers, t).name)
            .join(", ")}{" "}
          typing…
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
