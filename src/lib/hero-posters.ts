import { CATALOG, posterUrl } from "@/lib/movies";
import { browseTmdb, tmdbConfigured } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export type HeroPoster = {
  id: string;
  title: string;
  src: string;
};

const HERO_POSTER_LIMIT = 40;

function toHeroPoster(movie: Movie): HeroPoster | null {
  if (!movie.posterPath) return null;
  const src = posterUrl(movie, "w342");
  if (!src || src === "/poster-fallback.svg") return null;
  return { id: movie.id, title: movie.title, src };
}

function curatedFallback(): HeroPoster[] {
  const seen = new Set<string>();
  const out: HeroPoster[] = [];
  for (const movie of CATALOG) {
    const poster = toHeroPoster(movie);
    if (!poster || seen.has(poster.src)) continue;
    seen.add(poster.src);
    out.push(poster);
    if (out.length >= HERO_POSTER_LIMIT) break;
  }
  return out;
}

function mergeUnique(batches: Movie[][]): HeroPoster[] {
  const seen = new Set<string>();
  const out: HeroPoster[] = [];
  for (const batch of batches) {
    for (const movie of batch) {
      const poster = toHeroPoster(movie);
      if (!poster || seen.has(poster.id) || seen.has(poster.src)) continue;
      seen.add(poster.id);
      seen.add(poster.src);
      out.push(poster);
      if (out.length >= HERO_POSTER_LIMIT) return out;
    }
  }
  return out;
}

function padWithFallback(primary: HeroPoster[], fallback: HeroPoster[]): HeroPoster[] {
  if (primary.length >= HERO_POSTER_LIMIT) return primary.slice(0, HERO_POSTER_LIMIT);
  const seen = new Set(primary.flatMap((p) => [p.id, p.src]));
  const out = [...primary];
  for (const poster of fallback) {
    if (seen.has(poster.id) || seen.has(poster.src)) continue;
    seen.add(poster.id);
    seen.add(poster.src);
    out.push(poster);
    if (out.length >= HERO_POSTER_LIMIT) break;
  }
  return out;
}

/**
 * Latest / top-rated TMDB posters for the landing spiral wall.
 * Always pads with curated CATALOG so the wall stays full if TMDB is thin/down.
 */
export async function loadHeroPosters(): Promise<HeroPoster[]> {
  const fallback = curatedFallback();
  if (!tmdbConfigured()) return fallback;

  try {
    const [topRated, trending, nowPlaying] = await Promise.all([
      browseTmdb({ kind: "top_rated", media: "movie", page: 1 }),
      browseTmdb({ kind: "trending", media: "all", page: 1 }),
      browseTmdb({ kind: "now_playing", media: "movie", page: 1 }),
    ]);

    const merged = mergeUnique([
      topRated.movies,
      trending.movies,
      nowPlaying.movies,
    ]);

    return padWithFallback(merged, fallback);
  } catch {
    return fallback;
  }
}
