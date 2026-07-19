import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  getOrCreateConversationDb,
  listConversationsDb,
  unreadDirectCountDb,
} from "@/lib/server/messages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const [conversations, unread] = await Promise.all([
    listConversationsDb(auth.userId),
    unreadDirectCountDb(auth.userId),
  ]);
  return NextResponse.json({ conversations, unread });
}

/** Start or open a 1:1 thread with a friend. */
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { friendId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.friendId) {
    return NextResponse.json({ error: "friendId required" }, { status: 400 });
  }
  const result = await getOrCreateConversationDb(auth.userId, body.friendId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
