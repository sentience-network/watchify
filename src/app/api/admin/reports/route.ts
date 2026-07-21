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
import {
  listUploadsForAdmin,
  moderateUploadStatus,
} from "@/lib/server/uploads-db";

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
  const [reports, uploads] = await Promise.all([
    listReports({ status }),
    listUploadsForAdmin({
      status: status === "all" ? "all" : undefined,
      limit: 40,
    }).then((rows) =>
      status === "all"
        ? rows
        : rows.filter((u) =>
            ["pending", "quarantined"].includes(u.status)
          )
    ),
  ]);
  return NextResponse.json({
    reports,
    uploads: uploads.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      sourceUrl: u.sourceUrl,
      status: u.status,
      flags: (() => {
        try {
          return JSON.parse(u.flagReasonsJson || "[]");
        } catch {
          return [];
        }
      })(),
      createdAt: u.createdAt.toISOString(),
      owner: u.owner,
      catalogId: `ugc-${u.id}`,
    })),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;

  let body: {
    reportId?: string;
    uploadId?: string;
    action?: "dismiss" | "warn" | "ban" | "quarantine" | "approve" | "reject";
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.uploadId && body.action) {
    if (!["approve", "quarantine", "reject"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid upload action" }, { status: 400 });
    }
    const result = await moderateUploadStatus({
      uploadId: body.uploadId,
      reviewerId: auth.user.id,
      action: body.action as "approve" | "quarantine" | "reject",
      note: body.note,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.reportId || !body.action) {
    return NextResponse.json(
      { error: "reportId and action required" },
      { status: 400 }
    );
  }
  if (!["dismiss", "warn", "ban", "quarantine"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await moderateReport({
    reportId: body.reportId,
    reviewerId: auth.user.id,
    action: body.action as "dismiss" | "warn" | "ban" | "quarantine",
    note: body.note,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
