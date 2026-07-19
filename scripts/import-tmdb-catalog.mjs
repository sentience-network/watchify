/**
 * Pull a large Watchify catalog from TMDB (metadata + posters only).
 * Usage: node scripts/import-tmdb-catalog.mjs
 * Writes: src/lib/catalog-tmdb.generated.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outPath = resolve(root, "src/lib/catalog-tmdb.generated.json");

function loadEnvKey() {
  for (const name of [".env", ".env.production", ".env.local"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    const m = text.match(/^TMDB_API_KEY=(.+)$/m);
    if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return process.env.TMDB_API_KEY?.trim() || "";
}

const MOVIE_GENRES = {
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

const TV_GENRES = {
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
  10763: "Documentary",
  10764: "Comedy",
};

const KEY = loadEnvKey();
if (!KEY) {
  console.error("TMDB_API_KEY missing in .env");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }
  throw new Error(`${path} rate limited`);
}

async function fetchPaged(path, pages, params = {}) {
  const rows = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb(path, { ...params, page });
    rows.push(...(data.results || []));
    await sleep(120);
  }
  return rows;
}

function yearFrom(date) {
  if (!date || date.length < 4) return 0;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : 0;
}

function mapMovie(item) {
  if (!item?.id || !item.poster_path) return null;
  const year = yearFrom(item.release_date);
  if (!year) return null;
  const genres = (item.genre_ids || [])
    .map((id) => MOVIE_GENRES[id])
    .filter(Boolean)
    .slice(0, 3);
  return {
    id: `tmdb-m-${item.id}`,
    title: (item.title || item.original_title || "").trim(),
    year,
    overview: (item.overview || "No overview available.").trim(),
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path || item.poster_path,
    genres: genres.length ? genres : ["Drama"],
    runtime: 0,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    tmdbId: item.id,
    mediaType: "movie",
    licenseKind: "catalog",
  };
}

function mapTv(item) {
  if (!item?.id || !item.poster_path) return null;
  const year = yearFrom(item.first_air_date);
  if (!year) return null;
  const genres = (item.genre_ids || [])
    .map((id) => TV_GENRES[id])
    .filter(Boolean)
    .slice(0, 3);
  return {
    id: `tmdb-tv-${item.id}`,
    title: (item.name || item.original_name || "").trim(),
    year,
    overview: (item.overview || "No overview available.").trim(),
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path || item.poster_path,
    genres: genres.length ? genres : ["Drama"],
    runtime: 45,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    tmdbId: item.id,
    mediaType: "tv",
    licenseKind: "catalog",
  };
}

async function enrichRuntimes(movies, limit = 120) {
  // Sample of popular movies get real runtimes; rest stay 0 (UI treats as unknown).
  let n = 0;
  for (const m of movies) {
    if (m.mediaType !== "movie" || m.runtime > 0) continue;
    if (n >= limit) break;
    try {
      const detail = await tmdb(`/movie/${m.tmdbId}`);
      m.runtime = detail.runtime || 0;
      n++;
      await sleep(80);
    } catch {
      /* keep 0 */
    }
  }
}

async function main() {
  console.log("Fetching TMDB lists…");
  const movieLists = await Promise.all([
    fetchPaged("/movie/popular", 15),
    fetchPaged("/movie/top_rated", 12),
    fetchPaged("/movie/now_playing", 5),
    fetchPaged("/movie/upcoming", 4),
    fetchPaged("/discover/movie", 8, {
      sort_by: "popularity.desc",
      "vote_count.gte": 200,
      with_genres: "28|12|878|27|53",
    }),
    fetchPaged("/discover/movie", 6, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 1500,
    }),
    fetchPaged("/discover/movie", 5, {
      sort_by: "popularity.desc",
      with_genres: "16|10751",
    }),
    fetchPaged("/discover/movie", 5, {
      sort_by: "popularity.desc",
      with_genres: "35|10749",
    }),
  ]);
  const tvLists = await Promise.all([
    fetchPaged("/tv/popular", 10),
    fetchPaged("/tv/top_rated", 8),
    fetchPaged("/discover/tv", 6, {
      sort_by: "popularity.desc",
      "vote_count.gte": 200,
    }),
  ]);

  const byKey = new Map();
  for (const item of movieLists.flat()) {
    const row = mapMovie(item);
    if (!row?.title) continue;
    byKey.set(`movie:${row.tmdbId}`, row);
  }
  for (const item of tvLists.flat()) {
    const row = mapTv(item);
    if (!row?.title) continue;
    byKey.set(`tv:${row.tmdbId}`, row);
  }

  let rows = [...byKey.values()].sort((a, b) => b.rating - a.rating || b.year - a.year);
  console.log(`Unique titles: ${rows.length}. Enriching runtimes for top movies…`);
  await enrichRuntimes(rows, 150);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "tmdb",
    count: rows.length,
    movies: rows.filter((r) => r.mediaType === "movie").length,
    tv: rows.filter((r) => r.mediaType === "tv").length,
    titles: rows,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 0), "utf8");
  console.log(`Wrote ${rows.length} titles → ${outPath}`);
  console.log(`  movies: ${payload.movies}, tv: ${payload.tv}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
