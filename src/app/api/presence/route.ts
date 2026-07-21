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
      watchingStartedAt: true,
    },
  });
  return NextResponse.json({
    watching: rows.map((r) => ({
      userId: r.id,
      movieId: r.currentlyWatchingId!,
      serviceId: r.currentlyWatchingServiceId,
      progressPercent: r.watchingProgressPercent,
      watchingStartedAt: r.watchingStartedAt?.toISOString() ?? null,
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
    startTracker?: boolean;
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
      startTracker: body.startTracker,
    });
    if (body.movieId) await recordEvent("presence_shared", { userId: auth.userId, properties: { source: "manual" } });
  } else if (body.startTracker) {
    const me = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (me?.currentlyWatchingId) {
      await setPresence(auth.userId, {
        movieId: me.currentlyWatchingId,
        serviceId: me.currentlyWatchingServiceId as StreamingServiceId | null,
        progressPercent: me.watchingProgressPercent,
        startTracker: true,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
