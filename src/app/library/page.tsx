"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { freeMovies, posterUrl, rememberCatalogMovies } from "@/lib/movies";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";
import type { Movie } from "@/lib/types";

type FreeKind = "all" | "movies" | "tv";

type FreeCatalogResponse = {
  movies: Movie[];
  curated?: Movie[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  kind?: FreeKind;
  note?: string;
  curatedCount?: number;
  countsHint?: { curated: number; archiveKind: FreeKind; archiveTotal: number };
};

type SeriesSummary = {
  slug: string;
  title: string;
  episodeCount: number;
  year: number;
  posterPath: string;
  firstEpisodeId: string;
};

function TitleCard({ m }: { m: Movie }) {
  const thumb = posterUrl(m, "w500");
  const epBadge =
    m.season && m.episode
      ? `S${String(m.season).padStart(2, "0")}E${String(m.episode).padStart(2, "0")}`
      : m.episode
        ? `Ep ${m.episode}`
        : null;
  return (
    <Link
      href={`/watch/${m.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-panel/50 transition hover:border-teal/40"
    >
      <div className="relative aspect-video w-full bg-ink">
        <Image
          src={thumb}
          alt={`${m.title} preview`}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={
            thumb.startsWith("http") && !thumb.includes("image.tmdb.org")
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-ink">
          Play free
        </span>
        {epBadge && (
          <span className="absolute right-3 top-3 rounded-md bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-teal-soft">
            {epBadge}
          </span>
        )}
      </div>
      <div className="p-3">
        {m.seriesTitle ? (
          <>
            <p className="text-[11px] uppercase tracking-wide text-mist/60">
              {m.seriesTitle}
            </p>
            <p className="font-display font-semibold text-white">
              {m.episodeTitle || m.title}
            </p>
          </>
        ) : (
          <p className="font-display font-semibold text-white">{m.title}</p>
        )}
        <p className="text-xs text-mist/70">
          {m.year || "—"} · {m.licenseKind?.replace("_", " ") || "free"}
          {m.runtime ? ` · ${m.runtime}m` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-mist">{m.overview}</p>
      </div>
    </Link>
  );
}

function SeriesCard({ s }: { s: SeriesSummary }) {
  return (
    <Link
      href={`/library/series/${encodeURIComponent(s.slug)}`}
      className="group overflow-hidden rounded-2xl border border-line bg-panel/50 transition hover:border-teal/40"
    >
      <div className="relative aspect-video w-full bg-ink">
        <Image
          src={s.posterPath}
          alt={`${s.title} series`}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-ink">
          {s.episodeCount} episodes
        </span>
      </div>
      <div className="p-3">
        <p className="font-display font-semibold text-white">{s.title}</p>
        <p className="text-xs text-mist/70">
          {s.year || "Classic TV"} · A–Z series · ep1 → last
        </p>
      </div>
    </Link>
  );
}

function LibraryInner() {
  const searchParams = useSearchParams();
  const curatedLocal = freeMovies();
  const [curated, setCurated] = useState<Movie[]>(curatedLocal);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<SeriesSummary[]>([]);
  const [seriesNote, setSeriesNote] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const initialKind = ((): FreeKind => {
    const k = searchParams.get("kind");
    if (k === "tv" || k === "movies" || k === "all") return k;
    return "all";
  })();
  const [kind, setKind] = useState<FreeKind>(initialKind);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState("");

  const [seriesError, setSeriesError] = useState("");

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    setSeriesError("");
    try {
      const res = await fetch("/api/catalog/free/series");
      const data = (await res.json()) as {
        series?: SeriesSummary[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setSeries([]);
        setSeriesError(data.error || "Could not load series list.");
        return;
      }
      setSeries(data.series || []);
      setSeriesNote(data.note || null);
      if (!(data.series || []).length) {
        setSeriesError(
          "No series groups yet — Archive may be slow. Retry, or browse episodes below."
        );
      }
    } catch {
      setSeries([]);
      setSeriesError("Could not reach the series catalog.");
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  const load = useCallback(
    async (nextPage: number, nextQ: string, nextKind: FreeKind) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: "24",
          kind: nextKind,
        });
        if (nextQ.trim()) params.set("q", nextQ.trim());
        const res = await fetch(`/api/catalog/free?${params.toString()}`);
        const data = (await res.json()) as FreeCatalogResponse & {
          error?: string;
        };
        if (!res.ok) {
          setError(data.error || "Could not load free catalog");
          setMovies([]);
          setTotal(0);
          setTotalPages(0);
          return;
        }
        if (data.curated?.length) {
          setCurated(data.curated);
          rememberCatalogMovies(data.curated);
        } else if (nextKind === "tv") {
          setCurated([]);
        }
        setMovies(data.movies || []);
        rememberCatalogMovies(data.movies || []);
        setPage(data.page || nextPage);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setNote(data.note || null);
        if (!(data.movies || []).length && !(data.total || 0) && !nextQ.trim()) {
          setError(
            "Internet Archive returned no titles. This is usually temporary — retry in a moment."
          );
        }
      } catch {
        setError("Could not reach the free catalog. Retry in a moment.");
        setMovies([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(1, "", initialKind);
  }, [load, initialKind]);

  useEffect(() => {
    if (kind === "tv") void loadSeries();
  }, [kind, loadSeries]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(q);
    void load(1, q, kind);
  }

  function onKind(next: FreeKind) {
    setKind(next);
    void load(1, search, next);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Free
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Free & licensed on Watchify
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist/80">
            Thousands of public-domain movies and classic TV episodes from
            Internet Archive, plus curated Creative Commons shorts. Movies and
            series are A–Z; TV series list episodes from ep1 to the last.
          </p>
          <p className="mt-2 text-xs text-mist/60">{STREAMING_HONEST_COPY}</p>
          {note && (
            <p className="mt-3 text-xs text-teal-soft">
              {note}
              {total
                ? ` · Showing page ${page} of ${totalPages.toLocaleString()} (A–Z)`
                : ""}
            </p>
          )}
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "All free"],
              ["movies", "Movies"],
              ["tv", "TV / series"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onKind(id)}
              className={
                kind === id
                  ? "rounded-xl bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal-soft"
                  : "rounded-xl border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="mb-8 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              kind === "tv"
                ? "Search free classic TV…"
                : "Search free Archive titles…"
            }
            className="auth-field min-w-[220px] flex-1 rounded-xl border border-line bg-ink/80 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSearch("");
                void load(1, "", kind);
              }}
              className="rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
            >
              Clear
            </button>
          )}
        </form>

        {!search && kind !== "tv" && curated.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-white">
              Curated picks
            </h2>
            <p className="mt-1 text-xs text-mist/65">
              {curated.length} hand-checked CC / PD titles (A–Z) with reliable
              playback.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((m) => (
                <TitleCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}

        {kind === "tv" && !search && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-white">
              Series (A–Z)
            </h2>
            <p className="mt-1 text-xs text-mist/65">
              {seriesNote ||
                "Grouped classic TV — open a series for episodes in order."}
            </p>
            {seriesLoading && (
              <p className="mt-4 text-sm text-mist">Loading series…</p>
            )}
            {!seriesLoading && seriesError && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-soft/40 bg-amber-soft/10 px-3 py-2.5">
                <p className="text-sm text-amber-soft">{seriesError}</p>
                <button
                  type="button"
                  onClick={() => void loadSeries()}
                  className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Retry series
                </button>
              </div>
            )}
            {!seriesLoading && series.length > 0 && (
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {series.map((s) => (
                  <SeriesCard key={s.slug} s={s} />
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            {search
              ? `Results for “${search}”`
              : kind === "tv"
                ? "All episodes (A–Z)"
                : kind === "movies"
                  ? "Feature films (A–Z)"
                  : "Internet Archive library (A–Z)"}
          </h2>
          <p className="mt-1 text-xs text-mist/65">
            {loading
              ? "Loading Archive catalog…"
              : total
                ? `${total.toLocaleString()} public-domain MPEG4 titles in this filter`
                : search
                  ? "No matches in this filter"
                  : "Archive catalog unavailable"}
          </p>

          {error && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-soft/40 bg-amber-soft/10 px-3 py-2.5">
              <p className="text-sm text-amber-soft">{error}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void load(page || 1, search, kind)}
                className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
              >
                Retry catalog
              </button>
            </div>
          )}
          {loading && (
            <p className="mt-6 text-sm text-mist">Loading free titles…</p>
          )}

          {!loading && movies.length > 0 && (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {movies.map((m) => (
                <TitleCard key={m.id} m={m} />
              ))}
            </div>
          )}

          {!loading && !movies.length && !error && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-mist">
                {search
                  ? "No titles matched that search."
                  : "Nothing loaded from Internet Archive."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => void load(1, "", kind)}
                  className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Retry catalog
                </button>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1, search, kind)}
                className="rounded-xl border border-line px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-xs text-mist/70">
                Page {page} / {totalPages.toLocaleString()}
              </p>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1, search, kind)}
                className="rounded-xl border border-line px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>

        <div className="mt-10">
          <ScreenSharePanel />
        </div>

        <p className="mt-8 text-sm text-mist/70">
          Want licensed studio catalog too? Read{" "}
          <Link href="/content" className="text-teal-soft hover:underline">
            how Watchify acquires content
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-mist">Loading free library…</p>
        </AppShell>
      }
    >
      <LibraryInner />
    </Suspense>
  );
}
