import { NextResponse } from "next/server";
import { listDirectoryUsers, searchDirectoryUsers } from "@/lib/server/social-db";
import { requireUserId } from "@/lib/server/session";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // Guest browse: full public directory (no emails). Search requires sign-in.
  if (!q) {
    const users = await listDirectoryUsers();
    return NextResponse.json({ users });
  }

  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const limited = rateLimit(`user-search:${auth.userId}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many searches", retryAfterSec: limited.retryAfterSec },
      { status: 429 }
    );
  }

  const users = await searchDirectoryUsers(q, {
    limit: 16,
    excludeUserId: auth.userId,
  });

  const ids = users.map((u) => u.id);
  const [friendRows, requestRows] = await Promise.all([
    ids.length
      ? prisma.friendship.findMany({
          where: { userId: auth.userId, friendId: { in: ids } },
          select: { friendId: true },
        })
      : Promise.resolve([] as { friendId: string }[]),
    ids.length
      ? prisma.friendRequest.findMany({
          where: {
            status: "pending",
            OR: [
              { fromUserId: auth.userId, toUserId: { in: ids } },
              { fromUserId: { in: ids }, toUserId: auth.userId },
            ],
          },
        })
      : Promise.resolve([]),
  ]);

  const friendSet = new Set(friendRows.map((f) => f.friendId));
  const outgoing = new Set(
    requestRows
      .filter((r) => r.fromUserId === auth.userId)
      .map((r) => r.toUserId)
  );
  const incoming = new Set(
    requestRows
      .filter((r) => r.toUserId === auth.userId)
      .map((r) => r.fromUserId)
  );

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      relation: friendSet.has(u.id)
        ? "friends"
        : outgoing.has(u.id)
          ? "outgoing"
          : incoming.has(u.id)
            ? "incoming"
            : "none",
    })),
  });
}
