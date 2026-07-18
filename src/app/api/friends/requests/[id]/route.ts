import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  acceptFriendRequestDb,
  declineFriendRequestDb,
} from "@/lib/server/social-db";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { action?: "accept" | "decline" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action === "accept") {
    const result = await acceptFriendRequestDb(auth.userId, params.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  if (body.action === "decline") {
    const result = await declineFriendRequestDb(auth.userId, params.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "action must be accept|decline" }, { status: 400 });
}
