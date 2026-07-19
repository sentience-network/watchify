import { NextResponse } from "next/server";
import { searchTmdb, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

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
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const result = await searchTmdb(q, page);
  return NextResponse.json({ ...result, query: q, live: true });
}
