import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Soft-launch health probe.
 * GET /api/health → db ok + realtime URL note (ping realtime separately on :3345).
 */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" = "ok";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    db = "error";
    dbError = err instanceof Error ? err.message : "db failed";
  }

  const realtimeUrl =
    process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:3345";

  return NextResponse.json(
    {
      ok: db === "ok",
      service: "watchify",
      db,
      ...(dbError ? { dbError } : {}),
      realtime: {
        note: `Ping ${realtimeUrl} for Socket.io health ({"ok":true,"service":"watchify-realtime"})`,
        url: realtimeUrl,
      },
      stripeConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ),
      emailTransport: process.env.RESEND_API_KEY
        ? "resend"
        : process.env.SMTP_HOST
          ? "smtp"
          : process.env.WATCHIFY_EMAIL_ETHEREAL === "false"
            ? "console"
            : "ethereal",
      ms: Date.now() - started,
    },
    { status: db === "ok" ? 200 : 503 }
  );
}
