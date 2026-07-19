"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HostOnboarding } from "@/components/HostOnboarding";
import { MovieRow } from "@/components/MovieRow";
import { MovieTile } from "@/components/MovieTile";
import { ServiceBadge } from "@/components/ServiceBadge";
import { WatchingNowStrip } from "@/components/WatchingNowStrip";
import { DEMO_CATALOG_NOTE } from "@/lib/deep-links";
import {
  CATALOG,
  freeMovies,
  getMovie,
  rememberCatalogMovies,
  searchMovies,
} from "@/lib/movies";
import {
  compatibleFriends,
  liveFriendCount,
  recommendationsFromFriends,
} from "@/lib/social-graph";
import {
  STREAMING_SERVICES,
  isStreamingServiceId,
  type StreamingServiceId,
} from "@/lib/streaming";
import { TMDB_CATALOG_SCALE_NOTE } from "@/lib/tmdb";
import { useWatchify } from "@/lib/store";
import type { Movie } from "@/lib/types";
import { getUser } from "@/lib/users";

type ProviderFilter = "all" | "free" | StreamingServiceId;

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-teal/40 bg-teal/15 text-teal-soft"
          : "border-line text-mist hover:border-teal/30 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

type BrowsePayload = {
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
};

async function fetchBrowse(
  kind: string,
  media: string,
  page = 1
): Promise<BrowsePayload> {
  const res = await fetch(
    `/api/catalog/browse?kind=${encodeURIComponent(kind)}&media=${encodeURIComponent(media)}&page=${page}`
  );
  if (!res.ok) return { movies: [], page: 1, totalPages: 0, totalResults: 0 };
  return res.json();
}

export default function DiscoverPage() {
  const { state, openParties, publicWatching, ready, directoryUsers, currentUserId } =
    useWatchify();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>("all");
  const [tmdbLive, setTmdbLive] = useState(false);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTv, setPopularTv] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [liveResults, setLiveResults] = useState<Movie[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [livePage, setLivePage] = useState(1);
  const [liveTotalPages, setLiveTotalPages] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogScale, setCatalogScale] = useState(0);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setTmdbLive(Boolean(d.tmdbConfigured)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!tmdbLive) return;
    let cancelled = false;
    void Promise.all([
      fetchBrowse("trending", "all", 1),
      fetchBrowse("popular", "movie", 1),
      fetchBrowse("popular", "tv", 1),
      fetchBrowse("top_rated", "movie", 1),
    ]).then(([tr, pop, tv, top]) => {
      if (cancelled) return;
      rememberCatalogMovies([
        ...tr.movies,
        ...pop.movies,
        ...tv.movies,
        ...top.movies,
      ]);
      setTrending(tr.movies);
      setPopularMovies(pop.movies);
      setPopularTv(tv.movies);
      setTopRated(top.movies);
      setCatalogScale(
        Math.max(tr.totalResults, pop.totalResults, tv.totalResults, top.totalResults)
      );
    });
    return () => {
      cancelled = true;
    };
  }, [tmdbLive]);

  useEffect(() => {
    const q = query.trim();
    if (!tmdbLive || !q) {
      setLiveResults([]);
      setLiveTotal(0);
      setLivePage(1);
      setLiveTotalPages(0);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&page=1`)
        .then((r) => r.json())
        .then((data) => {
          const movies = (data.movies || []) as Movie[];
          rememberCatalogMovies(movies);
          setLiveResults(movies);
          setLiveTotal(data.totalResults || 0);
          setLivePage(data.page || 1);
          setLiveTotalPages(data.totalPages || 0);
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, tmdbLive]);

  const localResults = useMemo(() => {
    let list = searchMovies(query);
    if (provider === "free")
      list = list.filter((m) => Boolean(m.youtubePlaybackId || m.freePlaybackUrl));
    else if (provider !== "all") {
      list = list.filter((m) => m.providers?.some((p) => p.id === provider));
    }
    return list;
  }, [query, provider]);

  const results = useMemo(() => {
    if (provider === "free") return localResults;
    if (tmdbLive && query.trim()) {
      const seen = new Set(liveResults.map((m) => m.id));
      const localExtra = localResults.filter((m) => !seen.has(m.id));
      return [...liveResults, ...localExtra];
    }
    if (provider !== "all") return localResults;
    return localResults;
  }, [provider, tmdbLive, query, liveResults, localResults]);

  const onMyServices = useMemo(() => {
    if (!state.linkedServices.length) return [];
    return CATALOG.filter((m) =>
      m.providers?.some(
        (p) =>
          isStreamingServiceId(p.id) && state.linkedServices.includes(p.id)
      )
    ).slice(0, 24);
  }, [state.linkedServices]);
  const free = useMemo(() => freeMovies(), []);
  const liveFriends = ready ? liveFriendCount(state, directoryUsers) : 0;
  const liveParties = openParties.filter((p) => p.isLive);
  const recs = useMemo(
    () => (ready ? recommendationsFromFriends(state, currentUserId) : []),
    [ready, state, currentUserId]
  );
  const compatible = useMemo(
    () => (ready ? compatibleFriends(state, directoryUsers, currentUserId) : []),
    [ready, state, directoryUsers, currentUserId]
  );
  const watchingCount = publicWatching.length;
  const showFiltered = Boolean(query.trim()) || provider !== "all";
  const scaleLabel =
    catalogScale > 0
      ? `${catalogScale.toLocaleString()}+ titles indexed on TMDB for this feed`
      : "hundreds of thousands of titles";

  async function loadMoreSearch() {
    if (!query.trim() || livePage >= liveTotalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = livePage + 1;
      const res = await fetch(
        `/api/catalog/search?q=${encodeURIComponent(query.trim())}&page=${next}`
      );
      const data = await res.json();
      const movies = (data.movies || []) as Movie[];
      rememberCatalogMovies(movies);
      setLiveResults((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...movies.filter((m) => !seen.has(m.id))];
      });
      setLivePage(data.page || next);
      setLiveTotalPages(data.totalPages || liveTotalPages);
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadMoreBrowse(
    kind: string,
    media: string,
    setter: React.Dispatch<React.SetStateAction<Movie[]>>,
    current: Movie[]
  ) {
    const nextPage = Math.floor(current.length / 20) + 1;
    const more = await fetchBrowse(kind, media, Math.max(2, nextPage));
    rememberCatalogMovies(more.movies);
    setter((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...more.movies.filter((m) => !seen.has(m.id))];
    });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <HostOnboarding />
        <header className="mb-8 animate-fade-up">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
                Social streaming OS
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
                Watch together tonight
              </h1>
              <p className="mt-2 max-w-xl text-sm text-mist/80 md:text-base">
                Friends watching, live parties, and a full TMDB-powered catalog — search any movie or show.
              </p>
              <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-mist/55">
                {tmdbLive ? TMDB_CATALOG_SCALE_NOTE : DEMO_CATALOG_NOTE} · {free.length} free on Watchify
                {tmdbLive ? ` · ${scaleLabel}` : ` · ${CATALOG.length} local catalog`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/parties" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft animate-party-pulse">
                Start a party
              </Link>
              <Link href="/library" className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-mist hover:text-white">
                Watchify Free
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 text-teal-soft">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal animate-live-glow" />
              {liveFriends} friends watching
            </span>
            <span className="rounded-full border border-line px-3 py-1.5 text-mist">{watchingCount} public now</span>
            <span className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-amber-soft">{liveParties.length} live parties</span>
            {tmdbLive && (
              <span className="rounded-full border border-line px-3 py-1.5 text-mist">
                Live catalog · search the full TMDB library
              </span>
            )}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tmdbLive
                ? "Search millions of TMDB titles — movies & TV…"
                : "Search titles, genres, years, services…"
            }
            className="mt-5 w-full max-w-xl rounded-xl border border-line bg-panel/80 px-4 py-3 text-sm text-white outline-none ring-teal/40 placeholder:text-mist/40 focus:ring-2"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={provider === "all"} onClick={() => setProvider("all")}>All</FilterChip>
            <FilterChip active={provider === "free"} onClick={() => setProvider("free")}>Free on Watchify</FilterChip>
            {STREAMING_SERVICES.map((s) => (
              <FilterChip key={s.id} active={provider === s.id} onClick={() => setProvider(s.id)}>
                {s.shortName}
              </FilterChip>
            ))}
          </div>
        </header>

        {showFiltered ? (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-white">
              {query.trim()
                ? searching
                  ? "Searching…"
                  : tmdbLive
                    ? `Results · ${liveTotal.toLocaleString() || results.length}`
                    : `Results · ${results.length}`
                : `Filtered · ${results.length}`}
            </h2>
            <div className="flex flex-wrap gap-4">
              {results.map((m) => (
                <MovieTile key={m.id} movie={m} />
              ))}
              {!results.length && !searching && (
                <p className="text-mist">No matches — try another title or filter.</p>
              )}
            </div>
            {tmdbLive && query.trim() && livePage < liveTotalPages && (
              <button
                type="button"
                onClick={() => void loadMoreSearch()}
                disabled={loadingMore}
                className="mt-6 rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more titles"}
              </button>
            )}
          </section>
        ) : (
          <>
            <WatchingNowStrip />

            {liveParties.length > 0 && (
              <section className="mb-10 animate-fade-up">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-amber">Live now</p>
                    <h2 className="font-display text-xl font-semibold text-white">Jump into a party</h2>
                  </div>
                  <Link href="/parties" className="text-xs text-teal-soft hover:underline">All parties →</Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {liveParties.slice(0, 6).map((p) => {
                    const movie = getMovie(p.movieId);
                    const host = getUser(p.hostId);
                    if (!movie || !host) return null;
                    return (
                      <Link
                        key={p.id}
                        href={`/parties?join=${p.id}`}
                        className="min-w-[220px] shrink-0 rounded-2xl border border-teal/25 bg-panel/60 p-4 transition hover:border-teal/50 animate-party-pulse"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-soft">
                            Live · {p.memberIds.length} here
                          </span>
                          <ServiceBadge serviceId={p.serviceId} />
                        </div>
                        <p className="mt-2 font-display font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-mist/70">{movie.title} · {host.name}</p>
                        <p className="mt-2 text-[11px] text-mist/55">Join chat + open title — 1 tap</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {recs.length > 0 && (
              <section className="mb-10 animate-fade-up">
                <h2 className="mb-1 font-display text-xl font-semibold text-white">For you · from friends</h2>
                <p className="mb-4 text-xs text-mist/70">Taste graph picks — because people you follow watched them.</p>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                  {recs.map((r) => {
                    const movie = getMovie(r.movieId);
                    if (!movie) return null;
                    return (
                      <div key={r.movieId} className="w-[148px] shrink-0">
                        <MovieTile movie={movie} />
                        <p className="mt-1 line-clamp-2 text-[11px] text-teal-soft/90">{r.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {compatible.length > 0 && (
              <section className="mb-10 animate-fade-up">
                <h2 className="mb-1 font-display text-xl font-semibold text-white">Compatible friends</h2>
                <p className="mb-4 text-xs text-mist/70">Shared streaming services — easier own-account parties.</p>
                <div className="flex flex-wrap gap-2">
                  {compatible.map(({ user, overlap }) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-2 rounded-full border border-line bg-panel/50 py-1.5 pl-1.5 pr-3 hover:border-teal/35"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-ink"
                        style={{ background: `hsl(${user.avatarHue} 70% 55%)` }}
                      >
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{user.name}</p>
                        <div className="flex gap-1">
                          {overlap.slice(0, 3).map((id) => (
                            <ServiceBadge key={id} serviceId={id} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {onMyServices.length > 0 && (
              <MovieRow
                title="On your linked services"
                subtitle={`Titles tagged for ${state.linkedServices.join(", ")} — deep links open your own account`}
                movies={onMyServices}
              />
            )}

            <MovieRow title="Watchify Free · play here" subtitle="Synced parties on CC / public-domain titles" movies={free} />

            {tmdbLive && trending.length > 0 && (
              <section className="mb-10">
                <MovieRow
                  title="Trending this week"
                  subtitle="Live from TMDB — movies & TV"
                  movies={trending}
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-teal-soft hover:underline"
                  onClick={() =>
                    void loadMoreBrowse("trending", "all", setTrending, trending)
                  }
                >
                  Load more trending →
                </button>
              </section>
            )}

            {tmdbLive && popularMovies.length > 0 && (
              <section className="mb-10">
                <MovieRow
                  title="Popular movies"
                  subtitle="Paginated from TMDB’s full movie library"
                  movies={popularMovies}
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-teal-soft hover:underline"
                  onClick={() =>
                    void loadMoreBrowse("popular", "movie", setPopularMovies, popularMovies)
                  }
                >
                  Load more movies →
                </button>
              </section>
            )}

            {tmdbLive && popularTv.length > 0 && (
              <section className="mb-10">
                <MovieRow
                  title="Popular TV"
                  subtitle="Series from TMDB’s full TV library"
                  movies={popularTv}
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-teal-soft hover:underline"
                  onClick={() =>
                    void loadMoreBrowse("popular", "tv", setPopularTv, popularTv)
                  }
                >
                  Load more TV →
                </button>
              </section>
            )}

            {tmdbLive && topRated.length > 0 && (
              <MovieRow title="Top rated" subtitle="Critically loved on TMDB" movies={topRated} />
            )}

            {!tmdbLive && (
              <>
                <MovieRow title="Trending across the graph" subtitle="What people are queuing this week" movies={CATALOG.filter((m) => !m.youtubePlaybackId && !m.freePlaybackUrl).slice(0, 12)} />
                <MovieRow title="Critically loved" movies={[...CATALOG].filter((m) => !m.youtubePlaybackId && !m.freePlaybackUrl).sort((a, b) => b.rating - a.rating).slice(0, 12)} />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
