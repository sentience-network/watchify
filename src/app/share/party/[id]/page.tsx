import type { Metadata } from "next";
import Link from "next/link";
import { InviteJoinButton } from "@/components/InviteJoinButton";
import { ShareMenu } from "@/components/ShareMenu";
import { prisma } from "@/lib/db";
import {
  formatPlayhead,
  formatWatchStartedAt,
  suggestedJoinPlayheadSec,
} from "@/lib/deep-links";
import { getMovie } from "@/lib/movies";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { isFreePlayable } from "@/lib/free-content";
import { STREAMING_SERVICES } from "@/lib/streaming";

type Props = { params: { id: string } };

async function loadParty(code: string) {
  return prisma.party.findFirst({
    where: { OR: [{ inviteCode: code }, { id: code, visibility: "public" }] },
    include: {
      host: { select: { name: true } },
      members: { select: { userId: true } },
      playbackSync: true,
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const party = await loadParty(params.id);
  const movie = party ? getMovie(party.movieId) : undefined;
  const title = party ? `${party.name} — watch party` : "Watch party";
  const description =
    party && movie
      ? `${party.host.name} invited you to “${party.name}” for ${movie.title}. Preview the party, then sign in to join.`
      : "Preview a Watchify watch party, then sign in to join.";
  return buildPageMetadata({
    title,
    description,
    path: `/share/party/${params.id}`,
    // Portrait posters are handled by opengraph-image.tsx (1200×630 branded card).
    image: null,
  });
}

export default async function SharePartyPage({ params }: Props) {
  const party = await loadParty(params.id);
  const movie = party ? getMovie(party.movieId) : undefined;
  const expired = Boolean(party?.inviteExpiresAt && party.inviteExpiresAt < new Date());
  const unavailable = !party
    ? "This invite is invalid or private."
    : party.status !== "open"
      ? "This party has ended."
      : party.inviteRevokedAt
        ? "The host revoked this invite."
        : expired
          ? "This invite has expired."
          : party.members.length >= party.maxMembers
            ? "This party is full."
            : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <p className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </p>
      <h1 className="mt-6 font-display text-3xl font-bold text-white">
        You&apos;re invited
      </h1>
      {party && movie ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel/50 p-5">
          <p className="text-xs uppercase tracking-wider text-teal">
            {party.isLive ? "Live now" : "Scheduled"}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">
            {party.name}
          </p>
          <p className="mt-1 text-sm text-mist">
            {movie.title} · hosted by {party.host.name}
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-mist sm:grid-cols-2">
            <div><dt className="text-mist/60">Mode</dt><dd>{party.syncMode.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-mist/60">Room</dt><dd>{party.members.length}/{party.maxMembers} people</dd></div>
            <div className="sm:col-span-2"><dt className="text-mist/60">Access</dt><dd>{party.syncMode === "watchify_free" || isFreePlayable(movie) ? "Join chat, then Watchify Free auto-seeks to the party playhead." : "Join chat immediately. Open the title on your own service — exact URL timestamps usually are not supported; we show a live playhead + scrub helper."}</dd></div>
            {party.serviceId ? (
              <div className="sm:col-span-2">
                <dt className="text-mist/60">Host preferred service</dt>
                <dd>{STREAMING_SERVICES.find((s) => s.id === party.serviceId)?.name || party.serviceId}</dd>
              </div>
            ) : null}
            {party.playbackSync?.watchStartedAt ? (
              <div className="sm:col-span-2">
                <dt className="text-mist/60">Host started watching</dt>
                <dd>
                  {formatWatchStartedAt(
                    party.playbackSync.watchStartedAt.toISOString()
                  )}
                  {" · scrub to ~"}
                  {formatPlayhead(
                    suggestedJoinPlayheadSec(
                      party.playbackSync.watchStartedAt.toISOString(),
                      party.playbackSync.positionSec,
                      party.playbackSync.playing
                    )
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-mist/65">
            Keep personal information private. You can leave, block, or report people at any time.
          </p>
          <p className="mt-3 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs leading-relaxed text-mist/85">
            Soft launch tip: the first open after sleep can take{" "}
            <span className="font-medium text-amber-soft">30–60 seconds</span>. Wait,
            then refresh once — a hang is usually the free host waking, not a bad
            invite.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ShareMenu
              url={absoluteUrl(`/share/party/${params.id}`)}
              title={`${party.name} — Watchify party`}
              text={`Join ${party.host.name}'s Watchify party for ${movie.title}`}
            />
          </div>
          <InviteJoinButton inviteCode={params.id} disabledReason={unavailable} />
        </div>
      ) : (
        <p className="mt-6 text-mist">
          This invite is invalid, private, or no longer available.
        </p>
      )}
      <Link
        href="/parties"
        className="mt-8 inline-flex rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink hover:bg-teal-soft"
      >
        Open parties
      </Link>
    </main>
  );
}
