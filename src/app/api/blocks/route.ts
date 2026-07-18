import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { blockUserDb, unblockUserDb } from "@/lib/server/social-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { userId?: string; action?: "block" | "unblock" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (body.action === "unblock") {
    await unblockUserDb(auth.userId, body.userId);
    return NextResponse.json({ ok: true });
  }
  const result = await blockUserDb(auth.userId, body.userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
