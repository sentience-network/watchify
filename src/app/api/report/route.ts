import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { appendReport, type ReportKind } from "@/lib/server/reports";
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

  let body: {
    targetUserId?: string;
    targetMovieId?: string;
    targetKind?: string;
    reason?: string;
    details?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUserId = sanitizeText(body.targetUserId || "", 40) || null;
  const targetMovieId = sanitizeText(body.targetMovieId || "", 80) || null;
  const reason = sanitizeText(body.reason || "", 80);
  const kindRaw = sanitizeText(body.targetKind || "", 20);
  const targetKind = (
    kindRaw === "video" || kindRaw === "upload" || kindRaw === "user"
      ? kindRaw
      : targetMovieId
        ? "video"
        : "user"
  ) as ReportKind;

  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }
  if (targetKind === "user" && !targetUserId) {
    return NextResponse.json(
      { error: "targetUserId and reason are required" },
      { status: 400 }
    );
  }
  if (
    (targetKind === "video" || targetKind === "upload") &&
    !targetMovieId
  ) {
    return NextResponse.json(
      { error: "targetMovieId is required for video reports" },
      { status: 400 }
    );
  }

  const report = await appendReport({
    reporterId,
    targetUserId,
    targetMovieId,
    targetKind,
    reason,
    details: sanitizeText(body.details || "", 1000),
  });

  if ("error" in report) {
    return NextResponse.json({ error: report.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: report.id });
}
