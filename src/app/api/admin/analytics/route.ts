import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { funnelCounts } from "@/lib/server/analytics";
import { isStaffRole } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Moderator or admin access required" }, { status: 403 });
  }
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const counts = await funnelCounts(new Date(Date.now() - days * 86_400_000));
  return NextResponse.json({ days, counts });
}
