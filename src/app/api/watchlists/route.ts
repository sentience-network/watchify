import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { createWatchlistDb } from "@/lib/server/social-db";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const rows = await prisma.watchlist.findMany({
    where: {
      OR: [{ ownerId: auth.userId }, { isPublic: true }],
    },
    include: { items: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    watchlists: rows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      movieIds: w.items.map((i) => i.movieId),
      isPublic: w.isPublic,
      ownerId: w.ownerId,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await createWatchlistDb(
    auth.userId,
    body.name || "",
    body.description || ""
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ watchlist: result.value });
}
