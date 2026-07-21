import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { appendReport } from "@/lib/server/reports";

export const runtime = "nodejs";

/** Soft-launch product confusion feedback. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`feedback:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  let body: { route?: string; details?: string; partyMode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const route = sanitizeText(body.route || "", 200);
  const details = sanitizeText(body.details || "", 1000);
  const partyMode = sanitizeText(body.partyMode || "", 40);
  if (!details) {
    return NextResponse.json({ error: "details required" }, { status: 400 });
  }

  const userId = session?.user?.id || null;
  await prisma.analyticsEvent.create({
    data: {
      name: "product_confusion",
      userId,
      propertiesJson: JSON.stringify({ route, partyMode, details }),
    },
  });

  if (userId) {
    await appendReport({
      reporterId: userId,
      targetUserId: userId,
      reason: "product_confusion",
      details: `[${route}${partyMode ? ` · ${partyMode}` : ""}] ${details}`,
    });
  }

  return NextResponse.json({ ok: true });
}
