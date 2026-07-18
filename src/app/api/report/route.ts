import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { appendReport } from "@/lib/server/reports";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`report:${ip}`, 12, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const reporterId = session?.user?.id || "anonymous";

  let body: { targetUserId?: string; reason?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUserId = sanitizeText(body.targetUserId || "", 40);
  const reason = sanitizeText(body.reason || "", 80);
  if (!targetUserId || !reason) {
    return NextResponse.json(
      { error: "targetUserId and reason are required" },
      { status: 400 }
    );
  }

  const report = await appendReport({
    reporterId,
    targetUserId,
    reason,
    details: sanitizeText(body.details || "", 1000),
  });

  return NextResponse.json({ ok: true, id: report.id });
}
