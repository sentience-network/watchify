import { CATALOG, posterUrl } from "@/lib/movies";
import { browseTmdb, tmdbConfigured } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export type HeroPoster = {
  id: string;
  title: string;
  src: string;
};

const HERO_POSTER_LIMIT = 32;

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

/**
 * Latest / top-rated TMDB posters for the landing spiral wall.
 * Falls back to curated CATALOG when TMDB is unavailable.
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

    if (merged.length < 12) {
      const extras = fallback.filter(
        (p) => !merged.some((m) => m.id === p.id || m.src === p.src)
      );
      return [...merged, ...extras].slice(0, HERO_POSTER_LIMIT);
    }

    return merged;
  } catch {
    return fallback;
  }
}
