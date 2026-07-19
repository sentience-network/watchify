import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/server/session";
import { recommendFromTaste, tmdbConfigured } from "@/lib/tmdb";
import type { FavoritePerson } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!tmdbConfigured()) {
    return NextResponse.json(
      {
        movies: [],
        reasons: {},
        note: "TMDB_API_KEY required for taste recommendations.",
      },
      { status: 503 }
    );
  }

  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const me = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let favoriteMovieIds: string[] = [];
  let favoritePeople: FavoritePerson[] = [];
  try {
    favoriteMovieIds = JSON.parse(me.favoriteMovieIdsJson || "[]");
  } catch {
    favoriteMovieIds = [];
  }
  try {
    favoritePeople = JSON.parse(me.favoritePeopleJson || "[]");
  } catch {
    favoritePeople = [];
  }

  if (!favoriteMovieIds.length && !favoritePeople.length) {
    return NextResponse.json({
      movies: [],
      reasons: {},
      note: "Add favorite movies or actors/directors on your profile to unlock taste picks.",
    });
  }

  let recently: string[] = [];
  try {
    recently = JSON.parse(me.recentlyWatchedIdsJson || "[]");
  } catch {
    recently = [];
  }

  const result = await recommendFromTaste({
    favoriteMovieIds,
    favoritePeople,
    excludeIds: [
      ...favoriteMovieIds,
      ...recently,
      ...(me.currentlyWatchingId ? [me.currentlyWatchingId] : []),
    ],
  });

  return NextResponse.json({
    ...result,
    note: "Picks from your favorite movies, actors, and directors (TMDB).",
  });
}
