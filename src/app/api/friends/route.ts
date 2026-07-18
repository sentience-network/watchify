import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { sendFriendRequestDb } from "@/lib/server/social-db";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const [friendships, requests] = await Promise.all([
    prisma.friendship.findMany({ where: { userId: auth.userId } }),
    prisma.friendRequest.findMany({
      where: {
        OR: [{ fromUserId: auth.userId }, { toUserId: auth.userId }],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({
    friendIds: friendships.map((f) => f.friendId),
    friendRequests: requests.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { toUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.toUserId) {
    return NextResponse.json({ error: "toUserId required" }, { status: 400 });
  }
  const result = await sendFriendRequestDb(auth.userId, body.toUserId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
