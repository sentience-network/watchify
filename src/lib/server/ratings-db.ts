import { prisma } from "../db";

export type TitleScoreSummary = {
  movieId: string;
  /** Catalog / TMDB-style 0–10 score when known. */
  catalogScore: number | null;
  /** Community average 0–10. */
  userAverage: number | null;
  userCount: number;
  /** Blended display percent 0–100 (Rotten-style meter). */
  audiencePercent: number | null;
  myScore: number | null;
};

/**
 * Blend community ratings with catalog/TMDB score into an audience %.
 * When only one source exists, use that. Equal weight when both present.
 */
export function blendAudiencePercent(
  catalogScore: number | null | undefined,
  userAverage: number | null | undefined,
  userCount: number
): number | null {
  const cat =
    catalogScore != null && catalogScore > 0
      ? Math.min(10, Math.max(0, catalogScore))
      : null;
  const user =
    userAverage != null && userCount > 0
      ? Math.min(10, Math.max(0, userAverage))
      : null;
  if (cat == null && user == null) return null;
  if (cat != null && user != null) {
    return Math.round(((cat + user) / 2) * 10);
  }
  const only = cat ?? user!;
  return Math.round(only * 10);
}

export async function getTitleScoreSummary(
  movieId: string,
  opts?: { userId?: string | null; catalogScore?: number | null }
): Promise<TitleScoreSummary> {
  const agg = await prisma.titleRating.aggregate({
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });
  const userAverage =
    agg._count._all > 0 && agg._avg.score != null
      ? Math.round(agg._avg.score * 10) / 10
      : null;
  let myScore: number | null = null;
  if (opts?.userId) {
    const mine = await prisma.titleRating.findUnique({
      where: {
        userId_movieId: { userId: opts.userId, movieId },
      },
    });
    myScore = mine?.score ?? null;
  }
  const catalogScore =
    opts?.catalogScore != null && opts.catalogScore > 0
      ? opts.catalogScore
      : null;
  return {
    movieId,
    catalogScore,
    userAverage,
    userCount: agg._count._all,
    audiencePercent: blendAudiencePercent(
      catalogScore,
      userAverage,
      agg._count._all
    ),
    myScore,
  };
}

export async function upsertTitleRating(input: {
  userId: string;
  movieId: string;
  score: number;
}) {
  const score = Math.round(input.score);
  if (score < 1 || score > 10) {
    return { error: "Score must be 1–10" as const };
  }
  const movieId = input.movieId.trim().slice(0, 80);
  if (!movieId) return { error: "movieId required" as const };

  await prisma.titleRating.upsert({
    where: {
      userId_movieId: { userId: input.userId, movieId },
    },
    create: { userId: input.userId, movieId, score },
    update: { score },
  });
  return { ok: true as const };
}

export async function getAudiencePercentsForMovies(
  movieIds: string[],
  catalogById: Record<string, number | undefined>
): Promise<Record<string, number | null>> {
  const ids = Array.from(new Set(movieIds)).slice(0, 60);
  if (!ids.length) return {};
  const rows = await prisma.titleRating.groupBy({
    by: ["movieId"],
    where: { movieId: { in: ids } },
    _avg: { score: true },
    _count: { _all: true },
  });
  const byMovie = new Map(
    rows.map((r) => [
      r.movieId,
      {
        avg: r._avg.score,
        count: r._count._all,
      },
    ])
  );
  const out: Record<string, number | null> = {};
  for (const id of ids) {
    const row = byMovie.get(id);
    out[id] = blendAudiencePercent(
      catalogById[id] ?? null,
      row?.avg ?? null,
      row?.count ?? 0
    );
  }
  return out;
}
