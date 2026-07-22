"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { InviteFriendsPrompt } from "@/components/InviteFriendsPrompt";
import { MoviePoster } from "@/components/MoviePoster";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import { TitlePicker } from "@/components/TitlePicker";
import { absoluteUrl } from "@/lib/site";
import { getMovie, rememberCatalogMovies } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { copyToClipboard, partyShareUrl } from "@/lib/share";
import { partyInviteUrl } from "@/lib/social-graph";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import type { StreamingServiceId } from "@/lib/streaming";
import type { Movie, WatchParty } from "@/lib/types";
import { track } from "@/lib/analytics-client";
import { downloadPartyIcs, googleCalendarUrl } from "@/lib/calendar-ics";
import { formatScheduledWhen } from "@/lib/timezone-label";
import { WhoCanWatchList } from "@/components/WhoCanWatchList";
import { ServiceMismatchBanner } from "@/components/ServiceMismatchBanner";
import { WatchMatchPanel } from "@/components/WatchMatchPanel";
import {
  PartyRecapCard,
  type PartyRecap,
} from "@/components/PartyRecapCard";
import { rememberPartySnapshot } from "@/lib/party-recap-session";

function formatStart(startsAt: string | null, isLive: boolean) {
  return formatScheduledWhen(startsAt, isLive).primary;
}

function PartiesInner() {
  const search = useSearchParams();
  const router = useRouter();
  const {
    ready,
    state,
    currentUserId,
    directoryUsers,
    openParties,
    createParty,
    endParty,
    leaveParty,
    requestJoinParty,
    joinPartyByInvite,
    acceptJoinRequest,
    declineJoinRequest,
    myHostedJoinRequests,
    isFriend,
    canHostParties,
    refreshFromServer,
  } = useWatchify();

  const [name, setName] = useState("");
  const [movieId, setMovieId] = useState(state.currentlyWatchingId ?? "");
  const [liveNow, setLiveNow] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState("");
  const [serviceId, setServiceId] = useState<StreamingServiceId | "">(
    state.currentlyWatchingServiceId ?? state.linkedServices[0] ?? ""
  );
  const [syncMode, setSyncMode] = useState<
    NonNullable<WatchParty["syncMode"]>
  >("watchify_free");
  const [recurring, setRecurring] = useState(false);
  const [coHostId, setCoHostId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [promptPartyId, setPromptPartyId] = useState<string | null>(null);
  const [createExpanded, setCreateExpanded] = useState(false);
  const [recap, setRecap] = useState<PartyRecap | null>(null);
  const inviteHandled = useRef<string | null>(null);
  const prefillsHandled = useRef(false);

  const resolveUser = (id: string) =>
    directoryUsers.find((u) => u.id === id) || getUser(id);

  const pendingByParty = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of state.partyJoinRequests) {
      if (r.fromUserId === currentUserId && r.status === "pending") {
        map.set(r.partyId, r.id);
      }
    }
    return map;
  }, [state.partyJoinRequests, currentUserId]);

  useEffect(() => {
    const joined = search.get("joined");
    if (joined) {
      setHighlightId(joined);
      setPromptPartyId(joined);
      router.replace(`/parties/${encodeURIComponent(joined)}`);
      return;
    }

    const invite = search.get("invite") || search.get("join");
    if (!invite) return;

    // Legacy /parties?invite= links → public preview (OG + signed-out CTA)
    if (search.get("invite") && ready && !currentUserId) {
      router.replace(`/share/party/${encodeURIComponent(invite)}`);
      return;
    }

    setHighlightId(invite);
    if (!ready || !currentUserId) return;
    if (inviteHandled.current === invite) return;
    inviteHandled.current = invite;
    void joinPartyByInvite(invite).then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHighlightId(result.value.id);
      setPromptPartyId(result.value.id);
      setError("");
      rememberPartySnapshot(result.value);
      router.replace(`/parties/${encodeURIComponent(result.value.id)}`);
    });
  }, [search, ready, currentUserId, joinPartyByInvite, router]);

  // Prefill from ?movieId= / ?create=1&movieId= / ?syncMode= / ?club=1
  useEffect(() => {
    if (prefillsHandled.current) return;
    const mid = search.get("movieId");
    const mode = search.get("syncMode") as WatchParty["syncMode"] | null;
    const create = search.get("create");
    const club = search.get("club");
    if (!mid && !create && !mode && !club) return;
    prefillsHandled.current = true;
    if (create === "1" || mid || club === "1") setCreateExpanded(true);
    if (club === "1") setRecurring(true);
    if (mode === "own_account" || mode === "watchify_free" || mode === "social") {
      setSyncMode(mode);
    }
    if (!mid) return;
    const local = getMovie(mid);
    if (local) {
      setMovieId(local.id);
      if (!mode) {
        setSyncMode(isFreePlayable(local) ? "watchify_free" : "own_account");
      }
      return;
    }
    void fetch(`/api/catalog/title/${encodeURIComponent(mid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.movie) return;
        rememberCatalogMovies([data.movie as Movie]);
        setMovieId(data.movie.id);
        if (!mode) {
          setSyncMode(
            isFreePlayable(data.movie as Movie) ? "watchify_free" : "own_account"
          );
        }
      })
      .catch(() => undefined);
  }, [search]);

  function onTitlePicked(id: string, movie?: Movie) {
    setMovieId(id);
    const m = movie || getMovie(id);
    if (!m) return;
    if (syncMode === "watchify_free" && !isFreePlayable(m)) {
      setSyncMode("own_account");
    } else if (syncMode !== "watchify_free" && isFreePlayable(m)) {
      // Keep host choice; free titles can still use own-account if they want
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!movieId) {
      setError("Pick a title to watch together.");
      return;
    }
    const result = await createParty({
      name: name.trim() || "Watch party",
      movieId,
      startsAt: liveNow ? null : startsAt ? new Date(startsAt).toISOString() : null,
      isLive: liveNow,
      serviceId: serviceId || null,
      syncMode,
      recurringWeekly: recurring,
      coHostIds: coHostId ? [coHostId] : [],
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setName("");
    setLiveNow(true);
    setStartsAt("");
    setRecurring(false);
    setHighlightId(result.value.id);
    setPromptPartyId(result.value.id);
    // Immediate invite copy — fastest path to the viral loop
    await copyInvite(result.value);
    rememberPartySnapshot(result.value);
    router.push(`/parties/${result.value.id}`);
  }

  async function copyInvite(party: WatchParty) {
    const url = partyInviteUrl(party.id, undefined, {
      inviteCode: party.inviteCode,
    });
    const ok = await copyToClipboard(url);
    if (ok) {
      track("invite_copied", { partyId: party.id });
      setCopiedId(party.id);
      setTimeout(() => setCopiedId(""), 1600);
    } else {
      setError("Could not copy invite link");
    }
  }

  async function manageInvite(partyId: string, action: "refresh_invite" | "revoke_invite") {
    const response = await fetch("/api/parties", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, partyId }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not update invite");
    await refreshFromServer();
    setError(action === "revoke_invite" ? "Invite revoked." : "New seven-day invite created.");
  }

  async function rsvpImIn(party: WatchParty) {
    const response = await fetch("/api/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rsvp", partyId: party.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not RSVP");
      return;
    }
    track("party_rsvp", { partyId: party.id });
    await refreshFromServer();
    setHighlightId(party.id);
    setError("");
  }

  function addToCalendar(party: WatchParty, movieTitle: string) {
    const url = partyInviteUrl(party.id, undefined, {
      inviteCode: party.inviteCode,
    });
    downloadPartyIcs({ party, movieTitle, url });
    track("party_calendar_ics", { partyId: party.id });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Parties
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Watch together
          </h1>
          <p className="mt-2 text-sm text-mist/80">
            One-click rooms with invite links, live chat, presence, and reactions.
            Free titles sync playback on Watchify; paid apps use own-account sync.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-mist/65">
            {STREAMING_HONEST_COPY}
          </p>
        </header>

        {!ready ? (
          <p className="text-mist">Loading parties…</p>
        ) : (
          <>
            <div className="mb-8">
              <WatchMatchPanel />
            </div>
            {myHostedJoinRequests.length > 0 && (
              <section className="mb-8 rounded-2xl border border-amber/30 bg-panel/60 p-4 animate-fade-up">
                <h2 className="font-display text-lg font-semibold text-white">
                  Join requests
                </h2>
                <ul className="mt-3 space-y-3">
                  {myHostedJoinRequests.map((req) => {
                    const from = resolveUser(req.fromUserId);
                    const party = state.parties.find((p) => p.id === req.partyId);
                    const movie = party ? getMovie(party.movieId) : null;
                    if (!from || !party) return null;
                    return (
                      <li
                        key={req.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-3 py-3"
                      >
                        <p className="text-sm text-white">
                          <span className="font-semibold">{from.name}</span> →{" "}
                          {party.name}
                          {movie ? ` · ${movie.title}` : ""}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => acceptJoinRequest(req.id)}
                            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineJoinRequest(req.id)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section
              id="create-party"
              className="mb-10 rounded-2xl border border-line bg-panel/50 p-5 animate-fade-up"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    Create a party
                  </h2>
                  <p className="mt-1 text-sm text-mist/75">
                    Pick any title, choose how you sync, invite friends.
                  </p>
                </div>
                {!createExpanded && (
                  <button
                    type="button"
                    onClick={() => setCreateExpanded(true)}
                    className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
                  >
                    Start create
                  </button>
                )}
              </div>
              {!canHostParties && (
                <p className="mt-2 text-sm text-amber-soft">
                  Hosting needs the Party plan (or a free host credit).{" "}
                  <Link href="/pricing" className="underline">
                    Upgrade
                  </Link>{" "}
                  — you can still jump into open rooms below. New accounts get a
                  30-day Party trial.
                </p>
              )}
              {canHostParties &&
                state.plan !== "party" &&
                (state.freeHostsRemaining ?? 0) > 0 && (
                  <p className="mt-2 text-sm text-teal-soft">
                    Free host credit: {state.freeHostsRemaining} party left
                    without upgrading.
                  </p>
                )}
              {(createExpanded || movieId) && (
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist/60">
                    Title
                  </label>
                  <TitlePicker
                    value={movieId}
                    onChange={onTitlePicked}
                    freeOnly={syncMode === "watchify_free"}
                    placeholder="Search TMDB or browse free titles…"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist/60">
                    Sync mode
                  </label>
                  <select
                    value={syncMode}
                    onChange={(e) =>
                      setSyncMode(e.target.value as typeof syncMode)
                    }
                    className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                  >
                    <option value="watchify_free">
                      Watchify Free — real synced playback
                    </option>
                    <option value="own_account">
                      Own account — Netflix/Max/etc. (timing + playhead hints)
                    </option>
                    <option value="social">
                      Social only — chat + presence
                    </option>
                  </select>
                  {syncMode === "own_account" ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-mist/60">
                      Watchify does not stream paid apps. After you press play on
                      your service, start the watch tracker so friends know when
                      to join and what time to scrub to.
                    </p>
                  ) : null}
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Room name (optional — e.g. Friday sci-fi)"
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                />
                {movieId ? (
                  <WhoCanWatchList
                    movieId={movieId}
                    hostService={(serviceId || null) as StreamingServiceId | null}
                    syncMode={syncMode}
                    friendIds={state.friendIds}
                  />
                ) : null}
                {syncMode !== "watchify_free" &&
                  state.linkedServices.length > 0 && (
                    <select
                      value={serviceId}
                      onChange={(e) =>
                        setServiceId(e.target.value as StreamingServiceId | "")
                      }
                      className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                    >
                      <option value="">Service badge (optional)</option>
                      {state.linkedServices.map((id) => (
                        <option key={id} value={id}>
                          Host on {id}
                        </option>
                      ))}
                    </select>
                  )}
                <select
                  value={coHostId}
                  onChange={(e) => setCoHostId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                >
                  <option value="">Co-host (optional)</option>
                  {state.friendIds.map((id) => {
                    const u = resolveUser(id);
                    return u ? (
                      <option key={id} value={id}>
                        {u.name}
                      </option>
                    ) : null;
                  })}
                </select>
                <label className="flex items-center gap-2 text-sm text-mist">
                  <input
                    type="checkbox"
                    checked={liveNow}
                    onChange={(e) => setLiveNow(e.target.checked)}
                  />
                  Live now
                </label>
                <label className="flex items-center gap-2 text-sm text-mist">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                  />
                  Recurring weekly room
                </label>
                {!liveNow && (
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                  />
                )}
                {error && <p className="text-sm text-amber-soft">{error}</p>}
                <button
                  type="submit"
                  disabled={!canHostParties || !movieId}
                  className="rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-50"
                >
                  Create party → invite link
                </button>
              </form>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-xl font-semibold text-white">
                Open parties · {openParties.length}
              </h2>
              <div className="space-y-3">
                {openParties.map((party) => {
                  const host = resolveUser(party.hostId);
                  const movie = getMovie(party.movieId);
                  if (!host || !movie) return null;
                  const isHost = party.hostId === currentUserId;
                  const isCoHost = party.coHostIds?.includes(currentUserId);
                  const isMember = party.memberIds.includes(currentUserId);
                  const pending = pendingByParty.has(party.id);
                  const friendHost = isFriend(host.id);
                  const highlighted =
                    highlightId === party.id ||
                    highlightId === party.inviteCode;

                  return (
                    <article
                      key={party.id}
                      id={`party-${party.id}`}
                      className={`flex gap-4 rounded-2xl border bg-panel/50 p-4 animate-fade-up ${
                        highlighted
                          ? "border-teal/60 animate-party-pulse"
                          : "border-line"
                      }`}
                    >
                      <MoviePoster movie={movie} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-lg font-semibold text-white">
                              {party.name}
                              {party.recurringWeekly ? (
                                <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-amber-soft">
                                  Watch Club
                                  {party.hostClubStreak
                                    ? ` · ${party.hostClubStreak}wk streak`
                                    : ""}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-mist">
                              {movie.title} · {host.name}
                              {friendHost && !isHost ? " · Friend" : ""}
                              {party.serviceId ? (
                                <>
                                  {" "}
                                  · <ServiceBadge serviceId={party.serviceId} />
                                </>
                              ) : null}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-wider text-mist/50">
                              {party.syncMode || "social"} ·{" "}
                              {party.memberIds.length} in room
                              {party.startsAt && !party.isLive
                                ? ` · ${formatScheduledWhen(party.startsAt, false).detail || ""}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                              party.isLive
                                ? "bg-teal/20 text-teal-soft"
                                : "bg-amber/15 text-amber-soft"
                            }`}
                          >
                            {formatStart(party.startsAt, party.isLive)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!isMember && !isHost && !isCoHost ? (
                            <div className="w-full">
                              <ServiceMismatchBanner
                                party={party}
                                linkedServices={state.linkedServices}
                              />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => copyInvite(party)}
                            className="rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal-soft"
                          >
                            {copiedId === party.id
                              ? "Invite copied"
                              : "Copy invite"}
                          </button>
                          <ShareMenu
                            compact
                            url={
                              typeof window !== "undefined"
                                ? partyInviteUrl(party.id, undefined, {
                                    inviteCode: party.inviteCode,
                                  })
                                : partyShareUrl(party.id)
                            }
                            title={`Join ${party.name} on Watchify`}
                            text={`Join ${host.name}'s Watchify party for ${movie.title} — 1 tap`}
                          />
                          {party.startsAt && !party.isLive ? (
                            <>
                              <button
                                type="button"
                                onClick={() => addToCalendar(party, movie.title)}
                                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                              >
                                Add to calendar (.ics)
                              </button>
                              <a
                                href={googleCalendarUrl({
                                  party,
                                  movieTitle: movie.title,
                                  url: partyInviteUrl(party.id, undefined, {
                                    inviteCode: party.inviteCode,
                                  }),
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
                              >
                                Google Calendar
                              </a>
                            </>
                          ) : null}
                          {isHost || isCoHost ? (
                            <>
                              {isHost && <button type="button" onClick={() => manageInvite(party.id, "refresh_invite")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist">New invite</button>}
                              {isHost && !party.inviteRevokedAt && <button type="button" onClick={() => manageInvite(party.id, "revoke_invite")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist">Revoke invite</button>}
                              <Link
                                href={`/parties/${party.id}`}
                                className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft"
                              >
                                Enter room
                              </Link>
                              <button
                                type="button"
                                onClick={async () => {
                                  rememberPartySnapshot(party);
                                  const snapshot: PartyRecap = {
                                    party: { ...party },
                                    endedAt: new Date().toISOString(),
                                  };
                                  const next = await endParty(party.id);
                                  setRecap({
                                    ...snapshot,
                                    nextStartsAt: next?.nextStartsAt,
                                    nextPartyId: next?.nextPartyId,
                                  });
                                }}
                                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                              >
                                End party
                              </button>
                            </>
                          ) : isMember ? (
                            <>
                              <Link
                                href={`/parties/${party.id}`}
                                onClick={() => rememberPartySnapshot(party)}
                                className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft"
                              >
                                Enter room
                              </Link>
                              <button
                                type="button"
                                onClick={async () => {
                                  const result = await leaveParty(party.id);
                                  if (!result.ok) setError(result.error);
                                }}
                                className="rounded-lg border border-amber/40 px-3 py-1.5 text-xs text-amber-soft"
                              >
                                Leave
                              </button>
                            </>
                          ) : party.startsAt && !party.isLive ? (
                            <button
                              type="button"
                              onClick={() => void rsvpImIn(party)}
                              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft"
                            >
                              I&apos;m in
                            </button>
                          ) : pending ? (
                            <span className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist">
                              Request pending
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestJoinParty(party.id)}
                              className="rounded-lg bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber-soft"
                            >
                              Ask to join
                            </button>
                          )}
                        </div>
                        {(isMember || isHost || isCoHost) && (
                          <p className="mt-2 text-[11px] text-mist/60">
                            Video + chat live in the{" "}
                            <Link
                              href={`/parties/${party.id}`}
                              className="text-teal-soft hover:underline"
                            >
                              focus room
                            </Link>{" "}
                            — keeps this list light on phones.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!openParties.length && (
                  <p className="text-mist">No open parties — create one above.</p>
                )}
              </div>
            </section>
            {(() => {
              const mine = promptPartyId
                ? openParties.find((p) => p.id === promptPartyId)
                : null;
              if (!mine) return null;
              const movie = getMovie(mine.movieId);
              if (!movie) return null;
              const code = mine.inviteCode || mine.id;
              return (
                <InviteFriendsPrompt
                  active
                  partyId={mine.id}
                  inviteUrl={absoluteUrl(`/share/party/${code}`)}
                  partyName={mine.name}
                  movieTitle={movie.title}
                />
              );
            })()}
            {recap ? (
              <PartyRecapCard
                recap={recap}
                canHost={canHostParties}
                onSameTimeNextWeek={async () => {
                  if (recap.nextPartyId) {
                    router.push(`/parties/${recap.nextPartyId}`);
                    setRecap(null);
                    return;
                  }
                  if (!canHostParties) return;
                  const base = recap.party.startsAt
                    ? new Date(recap.party.startsAt)
                    : new Date();
                  const next = new Date(base.getTime() + 7 * 86_400_000);
                  const result = await createParty({
                    name: recap.party.name,
                    movieId: recap.party.movieId,
                    startsAt: next.toISOString(),
                    isLive: false,
                    serviceId: recap.party.serviceId,
                    syncMode: recap.party.syncMode,
                    coHostIds: recap.party.coHostIds,
                    recurringWeekly: true,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setRecap(null);
                  router.push(`/parties/${result.value.id}`);
                }}
                onClose={() => setRecap(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-mist">Loading…</p></AppShell>}>
      <PartiesInner />
    </Suspense>
  );
}
