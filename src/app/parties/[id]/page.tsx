"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MoviePoster } from "@/components/MoviePoster";
import {
  PartyRecapCard,
  type PartyRecap,
} from "@/components/PartyRecapCard";
import { PartySocialPanel } from "@/components/PartySocialPanel";
import { PartyVideoRoom } from "@/components/PartyVideoRoom";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import { TitlePicker } from "@/components/TitlePicker";
import { track } from "@/lib/analytics-client";
import { rememberPartySnapshot } from "@/lib/party-recap-session";
import { getMovie } from "@/lib/movies";
import { copyToClipboard } from "@/lib/share";
import { partyInviteUrl } from "@/lib/social-graph";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

/**
 * Focus / theater room — video + chat only, bookmarkable.
 */
export default function PartyFocusPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = typeof params.id === "string" ? params.id : "";
  const {
    ready,
    currentUserId,
    directoryUsers,
    openParties,
    state,
    endParty,
    leaveParty,
    updateParty,
    createParty,
    canHostParties,
    requestJoinParty,
    joinPartyByInvite,
    refreshFromServer,
  } = useWatchify();

  const [error, setError] = useState("");
  const [hostRecap, setHostRecap] = useState<PartyRecap | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMovieId, setEditMovieId] = useState("");
  const [editCoHostId, setEditCoHostId] = useState("");
  const [copied, setCopied] = useState(false);

  const party = useMemo(
    () =>
      openParties.find((p) => p.id === partyId) ||
      state.parties.find((p) => p.id === partyId),
    [openParties, state.parties, partyId]
  );

  const resolveUser = (id: string) =>
    directoryUsers.find((u) => u.id === id) || getUser(id);

  const isHost = party?.hostId === currentUserId;
  const isCoHost = Boolean(party?.coHostIds?.includes(currentUserId));
  const isMember = Boolean(
    party &&
      (party.memberIds.includes(currentUserId) || isHost || isCoHost)
  );

  useEffect(() => {
    if (party && isMember) rememberPartySnapshot(party);
  }, [party, isMember]);

  async function copyInvite() {
    if (!party) return;
    const url = partyInviteUrl(party.id, undefined, {
      inviteCode: party.inviteCode,
    });
    const ok = await copyToClipboard(url);
    if (ok) {
      track("invite_copied", { partyId: party.id });
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  async function onLeave() {
    const result = await leaveParty(partyId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/parties");
  }

  async function onEnd() {
    if (!party) return;
    const snapshot: PartyRecap = {
      party: { ...party },
      endedAt: new Date().toISOString(),
    };
    const next = await endParty(party.id);
    setHostRecap({
      ...snapshot,
      nextStartsAt: next?.nextStartsAt,
      nextPartyId: next?.nextPartyId,
    });
  }

  function startEdit() {
    if (!party) return;
    setEditName(party.name);
    setEditMovieId(party.movieId);
    setEditCoHostId(party.coHostIds?.[0] || "");
    setEditing(true);
    setError("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    const result = await updateParty(partyId, {
      name: editName,
      movieId: editMovieId || undefined,
      coHostIds: editCoHostId ? [editCoHostId] : [],
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setError("");
  }

  async function sameTimeNextWeek(from: PartyRecap) {
    if (from.nextPartyId) {
      setHostRecap(null);
      router.push(`/parties/${from.nextPartyId}`);
      return;
    }
    if (!canHostParties) {
      setError("Hosting needs the Party plan to rebook.");
      return;
    }
    const base = from.party.startsAt
      ? new Date(from.party.startsAt)
      : new Date();
    const next = new Date(base.getTime() + 7 * 86_400_000);
    const result = await createParty({
      name: from.party.name,
      movieId: from.party.movieId,
      startsAt: next.toISOString(),
      isLive: false,
      serviceId: from.party.serviceId,
      syncMode: from.party.syncMode,
      coHostIds: from.party.coHostIds,
      recurringWeekly: true,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    track("party_rebook_next_week", { partyId: result.value.id });
    setHostRecap(null);
    router.push(`/parties/${result.value.id}`);
  }

  if (!ready) {
    return (
      <AppShell>
        <p className="text-mist">Loading room…</p>
      </AppShell>
    );
  }

  if (!party && !hostRecap) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-white">
            Party not found
          </h1>
          <p className="mt-2 text-sm text-mist">
            This room may have ended or the invite expired.
          </p>
          <Link
            href="/parties"
            className="mt-6 inline-block rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink"
          >
            All parties
          </Link>
        </div>
      </AppShell>
    );
  }

  const movie = party ? getMovie(party.movieId) : null;
  const host = party ? resolveUser(party.hostId) : null;

  return (
    <AppShell>
      <div className="party-theater mx-auto max-w-3xl pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <Link href="/parties" className="text-teal-soft hover:underline">
            ← All parties
          </Link>
          <span className="text-mist/40">·</span>
          <span className="text-mist/70">Focus room</span>
        </div>

        {party ? (
          <>
            <header className="mb-4 animate-fade-up">
              <div className="flex gap-4">
                {movie ? <MoviePoster movie={movie} size="sm" /> : null}
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
                    {party.name}
                  </h1>
                  <p className="mt-1 text-sm text-mist">
                    {movie?.title || "Title"}
                    {host ? ` · ${host.name}` : ""}
                    {party.serviceId ? (
                      <>
                        {" "}
                        · <ServiceBadge serviceId={party.serviceId} />
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-mist/50">
                    {party.syncMode || "social"} · {party.memberIds.length} in
                    room
                    {party.isLive ? " · Live" : ""}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-mist/60">
                    {STREAMING_HONEST_COPY}
                  </p>
                </div>
              </div>
            </header>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal-soft"
              >
                {copied ? "Invite copied" : "Copy invite"}
              </button>
              <ShareMenu
                compact
                url={partyInviteUrl(party.id, undefined, {
                  inviteCode: party.inviteCode,
                })}
                title={`Join ${party.name} on Watchify`}
                text={`Join ${host?.name || "a friend"}'s Watchify party${
                  movie ? ` for ${movie.title}` : ""
                }`}
              />
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                  >
                    Edit room
                  </button>
                  <button
                    type="button"
                    onClick={() => void onEnd()}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                  >
                    End party
                  </button>
                </>
              ) : isCoHost ? (
                <button
                  type="button"
                  onClick={() => void onEnd()}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                >
                  End party
                </button>
              ) : isMember ? (
                <button
                  type="button"
                  onClick={() => void onLeave()}
                  className="rounded-lg border border-amber/40 px-3 py-1.5 text-xs text-amber-soft"
                >
                  Leave party
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void joinPartyByInvite(party.inviteCode || party.id).then(
                      (r) => {
                        if (!r.ok) {
                          requestJoinParty(party.id);
                          setError(r.error);
                        } else void refreshFromServer();
                      }
                    );
                  }}
                  className="rounded-lg bg-amber px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Ask to join
                </button>
              )}
            </div>

            {error ? (
              <p className="mb-3 text-sm text-amber-soft">{error}</p>
            ) : null}

            {editing && isHost ? (
              <form
                onSubmit={(e) => void saveEdit(e)}
                className="mb-4 space-y-3 rounded-2xl border border-line bg-panel/50 p-4"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  Edit party
                </h2>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                />
                <TitlePicker
                  value={editMovieId}
                  onChange={(id) => setEditMovieId(id)}
                  placeholder="Change title…"
                />
                <select
                  value={editCoHostId}
                  onChange={(e) => setEditCoHostId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                >
                  <option value="">No co-host</option>
                  {state.friendIds.map((id) => {
                    const u = resolveUser(id);
                    return u ? (
                      <option key={id} value={id}>
                        {u.name}
                      </option>
                    ) : null;
                  })}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {isMember ? (
              <div className="space-y-3 rounded-2xl border border-teal/25 bg-panel/40 p-3 md:p-4">
                <PartyVideoRoom partyId={party.id} />
                <PartySocialPanel partyId={party.id} theater />
              </div>
            ) : (
              <p className="rounded-xl border border-line bg-panel/40 p-4 text-sm text-mist">
                Join this room to open video + chat.
              </p>
            )}
          </>
        ) : null}

        {hostRecap ? (
          <PartyRecapCard
            recap={hostRecap}
            canHost={canHostParties}
            onSameTimeNextWeek={() => void sameTimeNextWeek(hostRecap)}
            onClose={() => {
              setHostRecap(null);
              router.push("/parties");
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
