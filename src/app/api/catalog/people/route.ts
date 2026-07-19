import { NextResponse } from "next/server";
import { searchTmdbPeople, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json(
      {
        people: [],
        note: "TMDB_API_KEY not configured — person search unavailable.",
      },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || "1") || 1;
  const result = await searchTmdbPeople(q, page);
  return NextResponse.json(result);
}
