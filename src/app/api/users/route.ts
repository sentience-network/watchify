import { NextResponse } from "next/server";
import { listDirectoryUsers } from "@/lib/server/social-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await listDirectoryUsers();
  return NextResponse.json({ users });
}
