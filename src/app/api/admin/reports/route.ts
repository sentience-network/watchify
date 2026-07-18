import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/server/users-db";
import {
  isStaffRole,
  listReports,
  moderateReport,
  type ReportStatus,
} from "@/lib/server/reports";

export const runtime = "nodejs";

async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await findUserById(session.user.id);
  if (!user || !isStaffRole(user.role) || user.bannedAt) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "open") as
    | ReportStatus
    | "all";
  const reports = await listReports({ status });
  return NextResponse.json({ reports });
}

export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;

  let body: {
    reportId?: string;
    action?: "dismiss" | "warn" | "ban";
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reportId || !body.action) {
    return NextResponse.json(
      { error: "reportId and action required" },
      { status: 400 }
    );
  }
  if (!["dismiss", "warn", "ban"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await moderateReport({
    reportId: body.reportId,
    reviewerId: auth.user.id,
    action: body.action,
    note: body.note,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
