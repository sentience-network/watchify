import type { FavoritePerson, Movie } from "./types";
import {
  buildWatchOffersFromTmdb,
  fallbackRentBuyOffers,
  type WatchOffersResult,
} from "./watch-offers";

export type TmdbPersonSummary = {
  id: number;
  name: string;
  department: FavoritePerson["department"];
  knownFor: string;
  profilePath: string | null;
  popularity: number;
};

export function personPosterUrl(profilePath: string | null | undefined): string {
  if (!profilePath) return "/poster-fallback.svg";
  if (profilePath.startsWith("http")) return profilePath;
  return `https://image.tmdb.org/t/p/w185${profilePath}`;
}

function mapDepartment(raw: string | undefined): FavoritePerson["department"] {
  if (raw === "Acting") return "Acting";
  if (raw === "Directing") return "Directing";
  return "Other";
}

const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Family",
  9648: "Mystery",
  10765: "Sci-Fi",
  10768: "War",
  37: "Western",
  10766: "Drama",
  10767: "Comedy",
  10764: "Comedy",
};

/** TMDB reports ~1M+ movie/TV records; we browse/search live rather than seed. */
export const TMDB_CATALOG_SCALE_NOTE =
  "Live TMDB catalog — browse and search hundreds of thousands of movies & TV titles (metadata only, never streams).";

export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

function apiKey(): string | null {
  return process.env.TMDB_API_KEY?.trim() || null;
}

export function parseTmdbCatalogId(
  id: string
): { mediaType: "movie" | "tv"; tmdbId: number } | null {
  const m = /^tmdb-(m|tv)-(\d+)$/.exec(id);
  if (!m) return null;
  return {
    mediaType: m[1] === "m" ? "movie" : "tv",
    tmdbId: Number(m[2]),
  };
}

export function tmdbCatalogId(mediaType: "movie" | "tv", tmdbId: number): string {
  return mediaType === "movie" ? `tmdb-m-${tmdbId}` : `tmdb-tv-${tmdbId}`;
}

function yearFrom(date?: string | null): number {
  if (!date || date.length < 4) return 0;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : 0;
}

function genresFromIds(ids: number[] | undefined, mediaType: "movie" | "tv"): string[] {
  const map = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
  const names = (ids || []).map((id) => map[id]).filter(Boolean);
  return names.length ? names.slice(0, 3) : ["Drama"];
}

type TmdbListItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  media_type?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
};

export function mapTmdbItemToMovie(
  item: TmdbListItem,
  mediaType: "movie" | "tv"
): Movie | null {
  if (!item?.id || !item.poster_path) return null;
  const title = (
    mediaType === "movie"
      ? item.title || item.original_title
      : item.name || item.original_name
  )?.trim();
  if (!title) return null;
  const year = yearFrom(
    mediaType === "movie" ? item.release_date : item.first_air_date
  );
  if (!year) return null;

  const genreIds =
    item.genre_ids ||
    item.genres?.map((g) => g.id) ||
    [];
  const runtime =
    mediaType === "movie"
      ? item.runtime || 0
      : item.episode_run_time?.[0] || 45;

  return {
    id: tmdbCatalogId(mediaType, item.id),
    title,
    year,
    overview: (item.overview || "No overview available.").trim(),
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path || item.poster_path,
    genres: genresFromIds(genreIds, mediaType),
    runtime,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    tmdbId: item.id,
    mediaType,
    licenseKind: "catalog",
  };
}

const liveCache = new Map<string, Movie>();

export function rememberMovies(movies: Movie[]): void {
  for (const m of movies) {
    if (m?.id) liveCache.set(m.id, m);
  }
}

export function getCachedMovie(id: string): Movie | undefined {
  return liveCache.get(id);
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type TmdbBrowseKind =
  | "popular"
  | "top_rated"
  | "trending"
  | "now_playing"
  | "upcoming"
  | "on_the_air";

export async function browseTmdb(options: {
  kind?: TmdbBrowseKind;
  media?: "movie" | "tv" | "all";
  page?: number;
  genreId?: number;
}): Promise<{
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
}> {
  const kind = options.kind || "popular";
  const media = options.media || "movie";
  const page = Math.max(1, options.page || 1);
  const empty = { movies: [], page, totalPages: 0, totalResults: 0 };

  if (!tmdbConfigured()) return empty;

  type Page = {
    page?: number;
    total_pages?: number;
    total_results?: number;
    results?: TmdbListItem[];
  };

  if (media === "all" || kind === "trending") {
    const data = await tmdbFetch<Page>(`/trending/all/week`, { page });
    if (!data) return empty;
    const movies = (data.results || [])
      .map((item) => {
        const mt =
          item.media_type === "tv"
            ? "tv"
            : item.media_type === "movie"
              ? "movie"
              : item.title
                ? "movie"
                : "tv";
        if (mt !== "movie" && mt !== "tv") return null;
        return mapTmdbItemToMovie(item, mt);
      })
      .filter((m): m is Movie => Boolean(m));
    rememberMovies(movies);
    return {
      movies,
      page: data.page || page,
      totalPages: Math.min(data.total_pages || 0, 500),
      totalResults: data.total_results || 0,
    };
  }

  let path = "";
  const params: Record<string, string | number> = { page };

  if (options.genreId) {
    path = media === "tv" ? "/discover/tv" : "/discover/movie";
    params.with_genres = options.genreId;
    params.sort_by = "popularity.desc";
  } else if (kind === "top_rated") {
    path = media === "tv" ? "/tv/top_rated" : "/movie/top_rated";
  } else if (kind === "now_playing") {
    path = "/movie/now_playing";
  } else if (kind === "upcoming") {
    path = "/movie/upcoming";
  } else if (kind === "on_the_air") {
    path = "/tv/on_the_air";
  } else {
    path = media === "tv" ? "/tv/popular" : "/movie/popular";
  }

  const data = await tmdbFetch<Page>(path, params);
  if (!data) return empty;
  const mt = media === "tv" ? "tv" : "movie";
  const movies = (data.results || [])
    .map((item) => mapTmdbItemToMovie(item, mt))
    .filter((m): m is Movie => Boolean(m));
  rememberMovies(movies);
  return {
    movies,
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 0, 500),
    totalResults: data.total_results || 0,
  };
}

export async function searchTmdb(
  query: string,
  page = 1
): Promise<{
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
}> {
  const q = query.trim();
  const empty = { movies: [], page, totalPages: 0, totalResults: 0 };
  if (!q || !tmdbConfigured()) return empty;

  type Page = {
    page?: number;
    total_pages?: number;
    total_results?: number;
    results?: TmdbListItem[];
  };

  const data = await tmdbFetch<Page>("/search/multi", {
    query: q,
    page,
    include_adult: "false",
  });
  if (!data) return empty;

  const movies = (data.results || [])
    .map((item) => {
      if (item.media_type === "movie") return mapTmdbItemToMovie(item, "movie");
      if (item.media_type === "tv") return mapTmdbItemToMovie(item, "tv");
      return null;
    })
    .filter((m): m is Movie => Boolean(m));
  rememberMovies(movies);
  return {
    movies,
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 0, 500),
    totalResults: data.total_results || 0,
  };
}

async function fetchTmdbTrailerYoutubeId(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<string | undefined> {
  const path =
    mediaType === "movie"
      ? `/movie/${tmdbId}/videos`
      : `/tv/${tmdbId}/videos`;
  const data = await tmdbFetch<{
    results?: {
      key?: string;
      site?: string;
      type?: string;
      official?: boolean;
    }[];
  }>(path);
  const videos = data?.results || [];
  const yt = videos.filter(
    (v) => v.site === "YouTube" && v.key && /trailer|teaser/i.test(v.type || "")
  );
  yt.sort((a, b) => Number(b.official) - Number(a.official));
  const pick =
    yt[0] ||
    videos.find((v) => v.site === "YouTube" && v.key) ||
    null;
  return pick?.key || undefined;
}

export async function fetchTmdbTitle(id: string): Promise<Movie | null> {
  const cached = getCachedMovie(id);
  if (cached?.trailerYoutubeId || cached?.youtubePlaybackId) return cached;

  const parsed = parseTmdbCatalogId(id);
  if (!parsed || !tmdbConfigured()) return null;

  const path =
    parsed.mediaType === "movie"
      ? `/movie/${parsed.tmdbId}`
      : `/tv/${parsed.tmdbId}`;
  const data = await tmdbFetch<TmdbListItem>(path);
  if (!data) return null;
  let movie = mapTmdbItemToMovie(data, parsed.mediaType);
  if (!movie) return null;

  const trailerId = await fetchTmdbTrailerYoutubeId(
    parsed.tmdbId,
    parsed.mediaType
  );
  if (trailerId) {
    movie = {
      ...movie,
      trailerYoutubeId: trailerId,
      licenseKind: movie.licenseKind || "trailer",
    };
  }
  // Merge with any prior cache fields (e.g. browse without trailer)
  if (cached) {
    movie = { ...cached, ...movie };
  }
  rememberMovies([movie]);
  return movie;
}

/**
 * Live watch/providers from TMDB (metadata only).
 * Includes stream + rent + buy partner links. Never scrapes streams.
 */
export async function fetchTmdbWatchProviders(
  tmdbId: number,
  title: string,
  region = "US",
  mediaType: "movie" | "tv" = "movie",
  year?: number
): Promise<WatchOffersResult> {
  const key = apiKey();
  if (!key) {
    const fb = fallbackRentBuyOffers(title, year);
    return {
      stream: [],
      rent: fb.rent,
      buy: fb.buy,
      providers: [...fb.rent, ...fb.buy],
      watchPageUrl: fb.watchPageUrl,
      source: "unavailable",
      note: "TMDB_API_KEY not set — curated stream links + partner Rent/Buy search.",
    };
  }

  try {
    const path =
      mediaType === "tv"
        ? `/tv/${tmdbId}/watch/providers`
        : `/movie/${tmdbId}/watch/providers`;
    const url = `https://api.themoviedb.org/3${path}?api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      const fb = fallbackRentBuyOffers(title, year);
      return {
        stream: [],
        rent: fb.rent,
        buy: fb.buy,
        providers: [...fb.rent, ...fb.buy],
        watchPageUrl: fb.watchPageUrl,
        source: "unavailable",
        note: `TMDB returned ${res.status} — falling back to curated + partner Rent/Buy links.`,
      };
    }
    const data = (await res.json()) as {
      results?: Record<
        string,
        {
          link?: string;
          flatrate?: { provider_id: number; provider_name: string }[];
          ads?: { provider_id: number; provider_name: string }[];
          rent?: { provider_id: number; provider_name: string }[];
          buy?: { provider_id: number; provider_name: string }[];
        }
      >;
    };
    const regionData = data.results?.[region];
    if (!regionData) {
      const fb = fallbackRentBuyOffers(title, year);
      return {
        stream: [],
        rent: fb.rent,
        buy: fb.buy,
        providers: [...fb.rent, ...fb.buy],
        watchPageUrl: fb.watchPageUrl,
        source: "fallback",
        note: `No TMDB watch data for ${region} — partner Rent/Buy links available.`,
      };
    }

    return buildWatchOffersFromTmdb({
      title,
      year,
      region,
      regionLink: regionData.link,
      flatrate: regionData.flatrate,
      ads: regionData.ads,
      rent: regionData.rent,
      buy: regionData.buy,
    });
  } catch {
    const fb = fallbackRentBuyOffers(title, year);
    return {
      stream: [],
      rent: fb.rent,
      buy: fb.buy,
      providers: [...fb.rent, ...fb.buy],
      watchPageUrl: fb.watchPageUrl,
      source: "unavailable",
      note: "TMDB request failed — using curated demo deep links + partner Rent/Buy.",
    };
  }
}

export async function searchTmdbPeople(
  query: string,
  page = 1
): Promise<{
  people: TmdbPersonSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
}> {
  const q = query.trim();
  const empty = { people: [], page, totalPages: 0, totalResults: 0 };
  if (!q || !tmdbConfigured()) return empty;

  type Page = {
    page?: number;
    total_pages?: number;
    total_results?: number;
    results?: {
      id?: number;
      name?: string;
      known_for_department?: string;
      profile_path?: string | null;
      popularity?: number;
      known_for?: { title?: string; name?: string; media_type?: string }[];
    }[];
  };

  const data = await tmdbFetch<Page>("/search/person", {
    query: q,
    page,
    include_adult: "false",
  });
  if (!data) return empty;

  const people: TmdbPersonSummary[] = (data.results || [])
    .filter((p) => p.id && p.name)
    .map((p) => {
      const known = (p.known_for || [])
        .map((k) => k.title || k.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      return {
        id: p.id!,
        name: p.name!.trim(),
        department: mapDepartment(p.known_for_department),
        knownFor: known,
        profilePath: p.profile_path || null,
        popularity: p.popularity || 0,
      };
    });

  return {
    people,
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 0, 500),
    totalResults: data.total_results || 0,
  };
}

export async function fetchTmdbPerson(personId: number): Promise<{
  person: TmdbPersonSummary & { biography: string };
  movies: Movie[];
} | null> {
  if (!tmdbConfigured() || !personId) return null;

  const [detail, movieCredits, tvCredits] = await Promise.all([
    tmdbFetch<{
      id?: number;
      name?: string;
      known_for_department?: string;
      profile_path?: string | null;
      popularity?: number;
      biography?: string;
    }>(`/person/${personId}`),
    tmdbFetch<{
      cast?: TmdbListItem[];
      crew?: (TmdbListItem & { job?: string; department?: string })[];
    }>(`/person/${personId}/movie_credits`),
    tmdbFetch<{
      cast?: TmdbListItem[];
      crew?: (TmdbListItem & { job?: string; department?: string })[];
    }>(`/person/${personId}/tv_credits`),
  ]);

  if (!detail?.id || !detail.name) return null;

  const dept = mapDepartment(detail.known_for_department);
  const creditItems: { item: TmdbListItem; media: "movie" | "tv"; rank: number }[] =
    [];

  for (const c of movieCredits?.cast || []) {
    creditItems.push({
      item: c,
      media: "movie",
      rank: (c as { order?: number }).order ?? 50,
    });
  }
  for (const c of movieCredits?.crew || []) {
    if (c.job === "Director" || c.department === "Directing") {
      creditItems.push({ item: c, media: "movie", rank: 0 });
    }
  }
  for (const c of tvCredits?.cast || []) {
    creditItems.push({
      item: { ...c, media_type: "tv" },
      media: "tv",
      rank: 40,
    });
  }
  for (const c of tvCredits?.crew || []) {
    if (c.job === "Director" || c.department === "Directing") {
      creditItems.push({
        item: { ...c, media_type: "tv" },
        media: "tv",
        rank: 0,
      });
    }
  }

  creditItems.sort(
    (a, b) =>
      a.rank - b.rank ||
      (b.item.vote_average || 0) - (a.item.vote_average || 0)
  );

  const seen = new Set<string>();
  const movies: Movie[] = [];
  for (const row of creditItems) {
    const m = mapTmdbItemToMovie(row.item, row.media);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    movies.push(m);
    if (movies.length >= 36) break;
  }
  rememberMovies(movies);

  return {
    person: {
      id: detail.id,
      name: detail.name.trim(),
      department: dept,
      knownFor: movies
        .slice(0, 3)
        .map((m) => m.title)
        .join(", "),
      profilePath: detail.profile_path || null,
      popularity: detail.popularity || 0,
      biography: (detail.biography || "").trim(),
    },
    movies,
  };
}

/**
 * Taste recommendations from favorite movies + favorite people (TMDB).
 */
export async function recommendFromTaste(input: {
  favoriteMovieIds: string[];
  favoritePeople: FavoritePerson[];
  excludeIds?: string[];
}): Promise<{ movies: Movie[]; reasons: Record<string, string> }> {
  if (!tmdbConfigured()) return { movies: [], reasons: {} };

  const exclude = new Set(input.excludeIds || []);
  const reasons: Record<string, string> = {};
  const scored = new Map<string, { movie: Movie; score: number }>();

  function add(movie: Movie, score: number, reason: string) {
    if (exclude.has(movie.id)) return;
    const prev = scored.get(movie.id);
    if (!prev || score > prev.score) {
      scored.set(movie.id, { movie, score: (prev?.score || 0) + score });
      reasons[movie.id] = reason;
    } else {
      prev.score += score;
    }
  }

  // Similar / recommended titles for each favorite movie
  for (const catalogId of input.favoriteMovieIds.slice(0, 6)) {
    const parsed = parseTmdbCatalogId(catalogId);
    if (!parsed) continue;
    const base =
      parsed.mediaType === "movie"
        ? `/movie/${parsed.tmdbId}`
        : `/tv/${parsed.tmdbId}`;
    const [similar, recs] = await Promise.all([
      tmdbFetch<{ results?: TmdbListItem[] }>(`${base}/similar`),
      tmdbFetch<{ results?: TmdbListItem[] }>(`${base}/recommendations`),
    ]);
    const seedTitle =
      getCachedMovie(catalogId)?.title ||
      (await fetchTmdbTitle(catalogId))?.title ||
      "a favorite";
    for (const item of similar?.results || []) {
      const m = mapTmdbItemToMovie(item, parsed.mediaType);
      if (m) add(m, 2, `Similar to ${seedTitle}`);
    }
    for (const item of recs?.results || []) {
      const m = mapTmdbItemToMovie(item, parsed.mediaType);
      if (m) add(m, 3, `Because you like ${seedTitle}`);
    }
  }

  // Credits from favorite actors / directors
  for (const person of input.favoritePeople.slice(0, 6)) {
    const detail = await fetchTmdbPerson(person.id);
    if (!detail) continue;
    const label =
      person.department === "Directing"
        ? `Directed by ${person.name}`
        : `Starring ${person.name}`;
    for (const m of detail.movies.slice(0, 12)) {
      add(
        m,
        person.department === "Directing" ? 4 : 3,
        label
      );
    }
  }

  const movies = Array.from(scored.values())
    .sort((a, b) => b.score - a.score || b.movie.rating - a.movie.rating)
    .map((x) => x.movie)
    .slice(0, 24);

  rememberMovies(movies);
  return { movies, reasons };
}
