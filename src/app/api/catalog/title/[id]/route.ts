import { NextResponse } from "next/server";
import {
  fetchArchiveTitle,
  parseArchiveCatalogId,
} from "@/lib/archive-org";
import { getMovie, rememberCatalogMovies } from "@/lib/movies";
import { fetchTmdbTitle, parseTmdbCatalogId, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = decodeURIComponent(params.id || "");
  const local = getMovie(id);

  // Archive titles: always refresh metadata so we resolve a playable MP4 when possible.
  if (parseArchiveCatalogId(id)) {
    const movie = await fetchArchiveTitle(id);
    if (!movie) {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
    return NextResponse.json({ movie, source: "archive.org" });
  }

  if (local) {
    return NextResponse.json({ movie: local, source: "local" });
  }

  if (!parseTmdbCatalogId(id)) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }

  if (!tmdbConfigured()) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const movie = await fetchTmdbTitle(id);
  if (!movie) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }
  rememberCatalogMovies([movie]);
  return NextResponse.json({ movie, source: "tmdb" });
}
