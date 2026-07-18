import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  addWatchlistItemDb,
  deleteWatchlistDb,
  removeWatchlistItemDb,
  updateWatchlistDb,
} from "@/lib/server/social-db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    addMovieId?: string;
    removeMovieId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.addMovieId) {
    const list = await addWatchlistItemDb(
      auth.userId,
      params.id,
      body.addMovieId
    );
    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ watchlist: list });
  }
  if (body.removeMovieId) {
    const list = await removeWatchlistItemDb(
      auth.userId,
      params.id,
      body.removeMovieId
    );
    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ watchlist: list });
  }

  const list = await updateWatchlistDb(auth.userId, params.id, body);
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ watchlist: list });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const ok = await deleteWatchlistDb(auth.userId, params.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
