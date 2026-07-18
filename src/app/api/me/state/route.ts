import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  listDirectoryUsers,
  loadAppStateForUser,
} from "@/lib/server/social-db";

export const runtime = "nodejs";

/** Hydrate client store from DB (server wins). */
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const [state, users] = await Promise.all([
    loadAppStateForUser(auth.userId),
    listDirectoryUsers(),
  ]);
  if (!state) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ state, users });
}
