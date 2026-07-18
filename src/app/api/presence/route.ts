import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  markFinished,
  setPresence,
  setWatchingProgress,
  updateProfile,
} from "@/lib/server/social-db";
import type { StreamingServiceId } from "@/lib/streaming";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/server/analytics";

export const runtime = "nodejs";

/** Public-ish presence for friends/directory (respects publicWatching). */
export async function GET() {
  const rows = await prisma.user.findMany({
    where: {
      currentlyWatchingId: { not: null },
      publicWatching: true,
    },
    select: {
      id: true,
      currentlyWatchingId: true,
      currentlyWatchingServiceId: true,
      watchingProgressPercent: true,
    },
  });
  return NextResponse.json({
    watching: rows.map((r) => ({
      userId: r.id,
      movieId: r.currentlyWatchingId!,
      serviceId: r.currentlyWatchingServiceId,
      progressPercent: r.watchingProgressPercent,
    })),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: {
    movieId?: string | null;
    serviceId?: StreamingServiceId | null;
    progressPercent?: number | null;
    publicWatching?: boolean;
    finishedMovieId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.finishedMovieId) {
    await markFinished(auth.userId, body.finishedMovieId);
    return NextResponse.json({ ok: true });
  }
  if (body.publicWatching !== undefined) {
    await updateProfile(auth.userId, { publicWatching: body.publicWatching });
  }
  if (body.progressPercent !== undefined && body.movieId === undefined) {
    await setWatchingProgress(auth.userId, body.progressPercent);
    return NextResponse.json({ ok: true });
  }
  if (body.movieId !== undefined) {
    await setPresence(auth.userId, {
      movieId: body.movieId,
      serviceId: body.serviceId,
      progressPercent: body.progressPercent,
    });
    if (body.movieId) await recordEvent("presence_shared", { userId: auth.userId, properties: { source: "manual" } });
  }
  return NextResponse.json({ ok: true });
}
