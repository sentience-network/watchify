"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FreePlayer } from "@/components/FreePlayer";
import { InviteFriendsPrompt } from "@/components/InviteFriendsPrompt";
import { ProviderDeepLinks } from "@/components/ScrubToTimeBanner";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { ShareMenu } from "@/components/ShareMenu";
import { DEMO_CATALOG_NOTE, RENT_BUY_COPY } from "@/lib/deep-links";
import { getMovie, rememberCatalogMovies } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { absoluteUrl } from "@/lib/site";
import { useWatchify } from "@/lib/store";
import type { Movie, MovieProvider } from "@/lib/types";

function WatchInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { setCurrentlyWatching, openParties } = useWatchify();
  const [movie, setMovie] = useState<Movie | undefined>(() => getMovie(params.id));
  const [loadingTitle, setLoadingTitle] = useState(!getMovie(params.id));
  const partyId = search.get("party") || undefined;
  const justJoined = search.get("joined") === "1";
  const [streamOffers, setStreamOffers] = useState<MovieProvider[] | null>(null);
  const [rentOffers, setRentOffers] = useState<MovieProvider[]>([]);
  const [buyOffers, setBuyOffers] = useState<MovieProvider[]>([]);
  const [watchPageUrl, setWatchPageUrl] = useState<string | null>(null);
  const [providerNote, setProviderNote] = useState<string | null>(null);
  const [nextEpisode, setNextEpisode] = useState<Movie | null>(null);
  const [seriesHref, setSeriesHref] = useState<string | null>(null);

  useEffect(() => {
    const local = getMovie(params.id);
    const needsLive =
      params.id.startsWith("ia-") ||
      params.id.startsWith("tmdb-") ||
      !local;
    if (local) {
      setMovie(local);
      if (!needsLive) {
        setLoadingTitle(false);
        return;
      }
    }
    let cancelled = false;
    if (!local) setLoadingTitle(true);
    void fetch(`/api/catalog/title/${encodeURIComponent(params.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.movie) {
          rememberCatalogMovies([data.movie as Movie]);
          setMovie(data.movie as Movie);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingTitle(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    setNextEpisode(null);
    setSeriesHref(null);
    if (!movie?.seriesSlug) return;
    let cancelled = false;
    void fetch(
      `/api/catalog/free/series/${encodeURIComponent(movie.seriesSlug)}?after=${encodeURIComponent(movie.id)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.series?.slug) {
          setSeriesHref(`/library/series/${encodeURIComponent(data.series.slug)}`);
        }
        if (data.nextEpisode) {
          rememberCatalogMovies([data.nextEpisode as Movie]);
          setNextEpisode(data.nextEpisode as Movie);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [movie]);

  useEffect(() => {
    if (
      !movie ||
      movie.freePlaybackUrl ||
      movie.youtubePlaybackId ||
      movie.archiveOrgId ||
      movie.id.startsWith("ia-")
    ) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/catalog/providers?movieId=${encodeURIComponent(movie.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.stream)) setStreamOffers(data.stream);
        else if (Array.isArray(data.providers)) {
          setStreamOffers(
            data.providers.filter(
              (p: MovieProvider) => !p.kind || p.kind === "stream"
            )
          );
        }
        if (Array.isArray(data.rent)) setRentOffers(data.rent);
        if (Array.isArray(data.buy)) setBuyOffers(data.buy);
        if (typeof data.watchPageUrl === "string") setWatchPageUrl(data.watchPageUrl);
        if (typeof data.note === "string") setProviderNote(data.note);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [movie]);

  if (loadingTitle) {
    return (
      <AppShell>
        <p className="text-mist">Loading title…</p>
      </AppShell>
    );
  }

  if (!movie) {
    return (
      <AppShell>
        <p className="text-mist">Title not found.</p>
      </AppShell>
    );
  }

  const free = isFreePlayable(movie);
  const providers =
    streamOffers ||
    (movie.providers || []).filter((p) => !p.kind || p.kind === "stream");
  const rentList = rentOffers;
  const buyList = buyOffers;
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `/watch/${movie.id}`;
  const party = partyId
    ? openParties.find((p) => p.id === partyId)
    : undefined;
  const inviteCode = party?.inviteCode || partyId;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl animate-fade-up">
        <p className="text-xs uppercase tracking-[0.16em] text-teal">
          Watchify Watch
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            {movie.seriesTitle && (
              <p className="mb-1 text-sm text-mist/70">
                {seriesHref ? (
                  <Link href={seriesHref} className="text-teal-soft hover:underline">
                    {movie.seriesTitle}
                  </Link>
                ) : (
                  movie.seriesTitle
                )}
                {movie.season && movie.episode
                  ? ` · S${String(movie.season).padStart(2, "0")}E${String(movie.episode).padStart(2, "0")}`
                  : movie.episode
                    ? ` · Ep ${movie.episode}`
                    : ""}
              </p>
            )}
            <h1 className="font-display text-3xl font-bold text-white">
              {movie.episodeTitle && movie.seriesTitle
                ? movie.episodeTitle
                : movie.title}
            </h1>
            <p className="mt-1 text-sm text-mist/75">
              {movie.year} · {movie.genres.join(" · ")}
              {free
                ? " · Free on Watchify"
                : movie.trailerYoutubeId
                  ? " · Trailer"
                  : ""}
              {movie.licenseKind
                ? ` · ${movie.licenseKind.replace("_", " ")}`
                : ""}
              {partyId ? " · party sync on" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!partyId ? (
              <Link
                href={`/parties?create=1&movieId=${encodeURIComponent(movie.id)}&syncMode=${free ? "watchify_free" : "own_account"}`}
                className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
              >
                Create party
              </Link>
            ) : null}
            <ShareMenu
              url={
                inviteCode
                  ? absoluteUrl(`/share/party/${inviteCode}`)
                  : shareUrl
              }
              title={`${movie.title} on Watchify`}
              text={
                free
                  ? `Watch ${movie.title} free on Watchify`
                  : `Watching ${movie.title} on Watchify`
              }
            />
          </div>
        </div>

        <div className="mt-6">
          {free ? (
            <FreePlayer movieId={movie.id} partyId={partyId} autoplay />
          ) : movie.trailerYoutubeId ? (
            <div className="space-y-3">
              <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                <iframe
                  title={`${movie.title} trailer`}
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-mist">
                Official trailer embed only — full film is not hosted on Watchify.
                Open a streamer below with your own account,{" "}
                <button
                  type="button"
                  className="text-teal-soft hover:underline"
                  onClick={() =>
                    setCurrentlyWatching(movie.id, { progressPercent: 0 })
                  }
                >
                  share that you&apos;re watching
                </button>
                , or{" "}
                <Link
                  href={`/parties?create=1&movieId=${encodeURIComponent(movie.id)}&syncMode=own_account`}
                  className="text-teal-soft hover:underline"
                >
                  start an own-account party
                </Link>{" "}
                with a join-time tracker for friends.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-panel/50 p-5 text-sm text-mist">
              No free playback or trailer for this title yet. Use deep links below
              or see{" "}
              <Link href="/content" className="text-teal-soft hover:underline">
                Content & licensing
              </Link>
              .
            </p>
          )}
        </div>

        {!free && (
          <div className="mt-5 space-y-4 rounded-2xl border border-line bg-panel/40 p-4">
            {providers.length > 0 && (
              <ProviderDeepLinks
                providers={providers}
                label="Stream with your subscription"
                mode="stream"
              />
            )}
            {(rentList.length > 0 || buyList.length > 0) && (
              <div className="space-y-2 border-t border-line/60 pt-3">
                {rentList.length > 0 && (
                  <ProviderDeepLinks
                    providers={rentList}
                    label={buyList.length ? "Rent now" : "Rent or buy"}
                    mode="rent"
                  />
                )}
                {buyList.length > 0 && (
                  <ProviderDeepLinks
                    providers={buyList}
                    label="Buy"
                    mode="buy"
                  />
                )}
                <p className="text-[11px] leading-relaxed text-mist/55">
                  {RENT_BUY_COPY}
                </p>
              </div>
            )}
            {watchPageUrl && (
              <a
                href={watchPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs font-medium text-teal-soft hover:underline"
              >
                See all where-to-watch options →
              </a>
            )}
            <p className="text-[11px] leading-relaxed text-mist/55">
              {providerNote || DEMO_CATALOG_NOTE}
            </p>
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed text-mist/80">
          {movie.overview}
        </p>

        {movie.attribution && (
          <p className="mt-3 text-xs text-mist/65">
            Attribution: {movie.attribution.creator} ·{" "}
            <a
              href={movie.attribution.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-teal-soft hover:underline"
            >
              {movie.attribution.license}
            </a>
            {" · "}
            <a
              href={movie.attribution.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-teal-soft hover:underline"
            >
              source
            </a>
          </p>
        )}

        {free && nextEpisode && (
          <div className="mt-6 rounded-2xl border border-teal/30 bg-teal/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-soft">
              Up next
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-white">
              {nextEpisode.episodeTitle || nextEpisode.title}
            </p>
            <p className="text-xs text-mist/70">
              {nextEpisode.season && nextEpisode.episode
                ? `S${String(nextEpisode.season).padStart(2, "0")}E${String(nextEpisode.episode).padStart(2, "0")}`
                : nextEpisode.episode
                  ? `Episode ${nextEpisode.episode}`
                  : "Next episode"}
              {nextEpisode.year ? ` · ${nextEpisode.year}` : ""}
            </p>
            <Link
              href={`/watch/${nextEpisode.id}${partyId ? `?party=${encodeURIComponent(partyId)}` : ""}`}
              className="mt-3 inline-flex rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
            >
              Play next episode
            </Link>
            {seriesHref && (
              <Link
                href={seriesHref}
                className="ml-3 text-sm text-teal-soft hover:underline"
              >
                All episodes
              </Link>
            )}
          </div>
        )}

        {free && !nextEpisode && seriesHref && (
          <p className="mt-6 text-sm text-mist/75">
            End of available episodes.{" "}
            <Link href={seriesHref} className="text-teal-soft hover:underline">
              Back to series
            </Link>
          </p>
        )}

        {free && (
          <div className="mt-8">
            <ScreenSharePanel />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/library" className="text-teal-soft hover:underline">
            Free library
          </Link>
          <Link href="/parties" className="text-teal-soft hover:underline">
            Parties
          </Link>
          <Link href="/content" className="text-teal-soft hover:underline">
            How we get content
          </Link>
        </div>
      </div>
      {partyId && justJoined && party && (
        <InviteFriendsPrompt
          active
          partyId={party.id}
          inviteUrl={absoluteUrl(`/share/party/${party.inviteCode || party.id}`)}
          partyName={party.name}
          movieTitle={movie.title}
        />
      )}
    </AppShell>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-mist">Loading…</p>
        </AppShell>
      }
    >
      <WatchInner />
    </Suspense>
  );
}
