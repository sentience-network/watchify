import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "./users-db";

export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return {
        error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
      };
    }
    if (user.bannedAt) {
      return {
        error: NextResponse.json(
          { error: "Account suspended" },
          { status: 403 }
        ),
      };
    }
  } catch {
    // If DB briefly unavailable, allow session through
  }
  return { userId: session.user.id };
}
