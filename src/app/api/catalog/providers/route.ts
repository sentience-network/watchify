import { NextResponse } from "next/server";
import { getMovie, rememberCatalogMovies } from "@/lib/movies";
import {
  fetchTmdbTitle,
  fetchTmdbWatchProviders,
  parseTmdbCatalogId,
  tmdbConfigured,
} from "@/lib/tmdb";
import { fallbackRentBuyOffers } from "@/lib/watch-offers";
import type { MovieProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

function withStreamKind(providers: MovieProvider[]): MovieProvider[] {
  return providers.map((p) =>
    p.kind ? p : { ...p, kind: "stream" as const }
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId") || "";
  let movie = getMovie(movieId);

  if (!movie && parseTmdbCatalogId(movieId)) {
    movie = (await fetchTmdbTitle(movieId)) || undefined;
    if (movie) rememberCatalogMovies([movie]);
  }

  if (!movie) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }

  const curated = withStreamKind(movie.providers || []);
  const fb = fallbackRentBuyOffers(movie.title, movie.year);

  if (!movie.tmdbId || !tmdbConfigured()) {
    const stream = curated;
    const rent = fb.rent;
    const buy = fb.buy;
    return NextResponse.json({
      movieId: movie.id,
      tmdbConfigured: tmdbConfigured(),
      source: "curated",
      note: tmdbConfigured()
        ? "No TMDB id on this title — curated stream links + partner Rent/Buy."
        : "Demo catalog: curated deep links + partner Rent/Buy. Set TMDB_API_KEY for live availability.",
      watchPageUrl: fb.watchPageUrl,
      stream,
      rent,
      buy,
      providers: [...stream, ...rent, ...buy],
    });
  }

  const live = await fetchTmdbWatchProviders(
    movie.tmdbId,
    movie.title,
    "US",
    movie.mediaType || "movie",
    movie.year
  );

  const stream = live.stream.length ? live.stream : curated;
  const rent = live.rent.length ? live.rent : fb.rent;
  const buy = live.buy.length ? live.buy : fb.buy;

  return NextResponse.json({
    movieId: movie.id,
    tmdbConfigured: true,
    source: live.source,
    note: live.note,
    watchPageUrl: live.watchPageUrl || fb.watchPageUrl,
    stream,
    rent,
    buy,
    providers: [...stream, ...rent, ...buy],
  });
}
