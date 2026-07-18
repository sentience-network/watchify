"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { InviteFriendsPrompt } from "@/components/InviteFriendsPrompt";
import { MoviePoster } from "@/components/MoviePoster";
import { PartySocialPanel } from "@/components/PartySocialPanel";
import { PartyVideoRoom } from "@/components/PartyVideoRoom";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import { absoluteUrl } from "@/lib/site";
import { CATALOG, freeMovies, getMovie } from "@/lib/movies";
import { copyToClipboard, partyShareUrl } from "@/lib/share";
import { partyInviteUrl } from "@/lib/social-graph";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import type { StreamingServiceId } from "@/lib/streaming";
import type { WatchParty } from "@/lib/types";
import { track } from "@/lib/analytics-client";

function formatStart(startsAt: string | null, isLive: boolean) {
  if (isLive || !startsAt) return "Live now";
  return new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [movieId, setMovieId] = useState(state.currentlyWatchingId ?? "m1");
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
  const inviteHandled = useRef<string | null>(null);

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
      router.replace(`/parties?joined=${encodeURIComponent(result.value.id)}`);
    });
  }, [search, ready, currentUserId, joinPartyByInvite, router]);

  const movieOptions = useMemo(() => {
    if (syncMode === "watchify_free") return freeMovies();
    return CATALOG.filter((m) => !m.freePlaybackUrl);
  }, [syncMode]);

  useEffect(() => {
    if (!movieOptions.some((m) => m.id === movieId) && movieOptions[0]) {
      setMovieId(movieOptions[0].id);
    }
  }, [movieOptions, movieId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!movieId) return;
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

            <section className="mb-10 rounded-2xl border border-line bg-panel/50 p-5 animate-fade-up">
              <h2 className="font-display text-xl font-semibold text-white">
                Create a party
              </h2>
              {!canHostParties && (
                <p className="mt-2 text-sm text-amber-soft">
                  Hosting needs the Party plan.{" "}
                  <Link href="/pricing" className="underline">
                    Upgrade
                  </Link>{" "}
                  — you can still jump into open rooms below.
                </p>
              )}
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Room name (e.g. Friday sci-fi)"
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                />
                <select
                  value={syncMode}
                  onChange={(e) =>
                    setSyncMode(e.target.value as typeof syncMode)
                  }
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                >
                  <option value="own_account">
                    Own-account sync (Netflix/Max/etc. — each uses own login)
                  </option>
                  <option value="watchify_free">
                    Watchify Free (real synced playback)
                  </option>
                  <option value="social">Social only (chat + presence)</option>
                </select>
                <select
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                >
                  {movieOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.year})
                    </option>
                  ))}
                </select>
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
                  disabled={!canHostParties}
                  className="rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-50"
                >
                  Create party → invite link
                </button>
              </form>
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
                                  Weekly
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
                              {party.recurringWeekly && party.startsAt
                                ? ` · next ${new Date(party.startsAt).toLocaleString()}`
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
                          {isHost || isCoHost ? (
                            <>
                              {isHost && <button type="button" onClick={() => manageInvite(party.id, "refresh_invite")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist">New invite</button>}
                              {isHost && !party.inviteRevokedAt && <button type="button" onClick={() => manageInvite(party.id, "revoke_invite")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist">Revoke invite</button>}
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = await endParty(party.id);
                                  if (next?.nextStartsAt) {
                                    window.alert(
                                      `Weekly room ended. Next occurrence scheduled for ${new Date(next.nextStartsAt).toLocaleString()}.`
                                    );
                                  }
                                }}
                                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                              >
                                End party
                              </button>
                            </>
                          ) : isMember ? (
                            <span className="rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal-soft">
                              You&apos;re in
                            </span>
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
                          <>
                            <PartyVideoRoom partyId={party.id} />
                            <PartySocialPanel partyId={party.id} />
                          </>
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
