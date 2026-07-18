import { NextResponse } from "next/server";
import { getMovie } from "@/lib/movies";
import { fetchTmdbWatchProviders, tmdbConfigured } from "@/lib/tmdb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId") || "";
  const movie = getMovie(movieId);
  if (!movie) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }

  const curated = movie.providers || [];
  if (!movie.tmdbId || !tmdbConfigured()) {
    return NextResponse.json({
      movieId: movie.id,
      tmdbConfigured: tmdbConfigured(),
      source: "curated",
      note: tmdbConfigured()
        ? "No TMDB id on this title — curated deep links."
        : "Demo catalog: curated deep links. Set TMDB_API_KEY for live watch/providers.",
      providers: curated,
    });
  }

  const live = await fetchTmdbWatchProviders(movie.tmdbId, movie.title);
  return NextResponse.json({
    movieId: movie.id,
    tmdbConfigured: true,
    source: live.source,
    note: live.note,
    providers: live.providers.length ? live.providers : curated,
  });
}
