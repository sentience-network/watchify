import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/server/session";
import { sealToken } from "@/lib/server/sealed-token";
import { syncTrakt, traktConfigured, traktRedirectUri } from "@/lib/server/trakt";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const connection = await prisma.traktConnection.findUnique({
    where: { userId: auth.userId },
    select: { lastSyncedAt: true, lastSyncError: true, updatedAt: true },
  });
  const imported = await prisma.importedMedia.findMany({
    where: { userId: auth.userId, source: "trakt" },
    select: { id: true, title: true, year: true, catalogId: true, watchedAt: true, mediaType: true },
    orderBy: { watchedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ configured: traktConfigured(), connected: Boolean(connection), connection, imported });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  if (!traktConfigured()) return NextResponse.json({ error: "Trakt configuration is required" }, { status: 503 });
  const body = await req.json().catch(() => ({})) as { action?: string };
  if (body.action === "sync") {
    try {
      const imported = await syncTrakt(auth.userId);
      return NextResponse.json({ ok: true, imported });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 502 });
    }
  }
  if (body.action && body.action !== "connect") {
    return NextResponse.json({ error: "Unknown Trakt action" }, { status: 400 });
  }
  const redirectUri = traktRedirectUri();
  if (!redirectUri) {
    return NextResponse.json({ error: "TRAKT_REDIRECT_URI (or NEXT_PUBLIC_APP_URL) is required" }, { status: 503 });
  }
  const state = sealToken(JSON.stringify({ userId: auth.userId, expiresAt: Date.now() + 10 * 60_000 }));
  const url = new URL("https://trakt.tv/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.TRAKT_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return NextResponse.json({ url: url.toString() });
}

export async function DELETE() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  await prisma.$transaction([
    prisma.traktConnection.deleteMany({ where: { userId: auth.userId } }),
    prisma.importedMedia.deleteMany({ where: { userId: auth.userId, source: "trakt" } }),
  ]);
  return NextResponse.json({ ok: true });
}
