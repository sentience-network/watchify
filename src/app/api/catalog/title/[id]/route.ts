import { NextResponse } from "next/server";
import {
  fetchArchiveTitle,
  parseArchiveCatalogId,
} from "@/lib/archive-org";
import { getLiveChannel, isLiveChannelId } from "@/lib/live-tv";
import { getMovie, rememberCatalogMovies } from "@/lib/movies";
import { fetchApprovedUploadMovie } from "@/lib/server/uploads-db";
import { fetchTmdbTitle, parseTmdbCatalogId, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = decodeURIComponent(params.id || "");
  const local = getMovie(id);

  if (isLiveChannelId(id)) {
    const channel = getLiveChannel(id) || (local?.isLive ? local : undefined);
    if (!channel) {
      return NextResponse.json({ error: "Live channel not found" }, { status: 404 });
    }
    rememberCatalogMovies([channel]);
    return NextResponse.json({ movie: channel, source: "live-tv" });
  }

  if (id.startsWith("ugc-")) {
    const movie = await fetchApprovedUploadMovie(id);
    if (!movie) {
      return NextResponse.json(
        { error: "Upload not found or not approved yet" },
        { status: 404 }
      );
    }
    rememberCatalogMovies([movie]);
    return NextResponse.json({ movie, source: "ugc" });
  }

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
