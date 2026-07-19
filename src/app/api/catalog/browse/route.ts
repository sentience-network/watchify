import { NextResponse } from "next/server";
import {
  browseTmdb,
  tmdbConfigured,
  type TmdbBrowseKind,
} from "@/lib/tmdb";

export const dynamic = "force-dynamic";

const KINDS = new Set<TmdbBrowseKind>([
  "popular",
  "top_rated",
  "trending",
  "now_playing",
  "upcoming",
  "on_the_air",
]);

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json(
      {
        error: "TMDB_API_KEY not configured",
        movies: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const kindRaw = (searchParams.get("kind") || "popular") as TmdbBrowseKind;
  const kind = KINDS.has(kindRaw) ? kindRaw : "popular";
  const mediaRaw = searchParams.get("media") || "movie";
  const media =
    mediaRaw === "tv" || mediaRaw === "all" || mediaRaw === "movie"
      ? mediaRaw
      : "movie";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const genreId = Number(searchParams.get("genre") || 0) || undefined;

  const result = await browseTmdb({ kind, media, page, genreId });
  return NextResponse.json({
    ...result,
    kind,
    media,
    live: true,
  });
}
