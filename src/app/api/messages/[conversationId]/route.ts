import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  listMessagesDb,
  sendDirectMessageDb,
} from "@/lib/server/messages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { conversationId: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const result = await listMessagesDb(auth.userId, params.conversationId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: { text?: string; linkUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await sendDirectMessageDb(
    auth.userId,
    params.conversationId,
    body.text || "",
    body.linkUrl
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
