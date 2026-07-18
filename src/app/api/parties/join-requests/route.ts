import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  acceptJoinRequestDb,
  declineJoinRequestDb,
} from "@/lib/server/social-db";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const rows = await prisma.partyJoinRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      partyId: r.partyId,
      fromUserId: r.fromUserId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { requestId?: string; action?: "accept" | "decline" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.requestId || !body.action) {
    return NextResponse.json(
      { error: "requestId and action required" },
      { status: 400 }
    );
  }
  const result =
    body.action === "accept"
      ? await acceptJoinRequestDb(auth.userId, body.requestId)
      : await declineJoinRequestDb(auth.userId, body.requestId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
