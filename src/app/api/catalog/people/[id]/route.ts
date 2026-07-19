import { NextResponse } from "next/server";
import { fetchTmdbPerson, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!tmdbConfigured()) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 503 }
    );
  }
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }
  const data = await fetchTmdbPerson(id);
  if (!data) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
