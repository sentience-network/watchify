import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getMovie } from "@/lib/movies";
import {
  getTitleScoreSummary,
  upsertTitleRating,
} from "@/lib/server/ratings-db";
import { fetchApprovedUploadMovie } from "@/lib/server/uploads-db";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function resolveCatalogScore(movieId: string): Promise<number | null> {
  const local = getMovie(movieId);
  if (local?.rating) return local.rating;
  if (movieId.startsWith("ugc-")) {
    const ugc = await fetchApprovedUploadMovie(movieId);
    return ugc?.rating || null;
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const movieId = sanitizeText(searchParams.get("movieId") || "", 80);
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  const catalogScore = await resolveCatalogScore(movieId);
  const summary = await getTitleScoreSummary(movieId, {
    userId: session?.user?.id,
    catalogScore,
  });
  return NextResponse.json({ summary });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const limited = rateLimit(`rate:${session.user.id}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { movieId?: string; score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const movieId = sanitizeText(body.movieId || "", 80);
  const score = Number(body.score);
  const result = await upsertTitleRating({
    userId: session.user.id,
    movieId,
    score,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const catalogScore = await resolveCatalogScore(movieId);
  const summary = await getTitleScoreSummary(movieId, {
    userId: session.user.id,
    catalogScore,
  });
  return NextResponse.json({ ok: true, summary });
}
