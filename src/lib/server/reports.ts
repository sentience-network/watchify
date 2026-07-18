import { prisma } from "../db";
import { sanitizeText } from "../sanitize";
import type { UserRole } from "../roles";
import { isStaffRole } from "../roles";

export type { UserRole };
export { isStaffRole };

export type ReportStatus = "open" | "dismissed" | "warned" | "banned";

export type SafetyReport = {
  id: string;
  reporterId: string;
  targetUserId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  actionNote?: string;
};

export async function appendReport(
  input: Omit<SafetyReport, "id" | "createdAt" | "status">
): Promise<SafetyReport> {
  const id = `r_${Math.random().toString(36).slice(2, 10)}`;
  const reporterId = sanitizeText(input.reporterId, 40);
  const targetUserId = sanitizeText(input.targetUserId, 40);
  const reason = sanitizeText(input.reason, 80);
  const details = sanitizeText(input.details, 1000);

  try {
    const [reporter, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: reporterId } }),
      prisma.user.findUnique({ where: { id: targetUserId } }),
    ]);
    if (reporter && target) {
      const row = await prisma.report.create({
        data: {
          id,
          reporterId,
          targetUserId,
          reason,
          details,
          status: "open",
        },
      });
      return {
        id: row.id,
        reporterId: row.reporterId,
        targetUserId: row.targetUserId,
        reason: row.reason,
        details: row.details,
        status: row.status as ReportStatus,
        createdAt: row.createdAt.toISOString(),
      };
    }
  } catch {
    // fall through
  }

  const report: SafetyReport = {
    id,
    reporterId,
    targetUserId,
    reason,
    details,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  console.info("[watchify:report]", report.id, report.targetUserId, report.reason);
  return report;
}

export async function listReports(opts?: {
  status?: ReportStatus | "all";
  limit?: number;
}) {
  const status = opts?.status || "open";
  const limit = Math.min(opts?.limit || 50, 100);
  const rows = await prisma.report.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      reporter: { select: { id: true, name: true, handle: true, email: true } },
      target: {
        select: {
          id: true,
          name: true,
          handle: true,
          email: true,
          bannedAt: true,
          warnedAt: true,
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status as ReportStatus,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewedById: r.reviewedById,
    actionNote: r.actionNote,
    reporter: r.reporter,
    target: r.target,
  }));
}

export async function moderateReport(input: {
  reportId: string;
  reviewerId: string;
  action: "dismiss" | "warn" | "ban";
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const report = await prisma.report.findUnique({
    where: { id: input.reportId },
  });
  if (!report) return { ok: false, error: "Report not found" };

  const note = sanitizeText(input.note || "", 500);
  const now = new Date();

  if (input.action === "dismiss") {
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: "dismissed",
        reviewedAt: now,
        reviewedById: input.reviewerId,
        actionNote: note || "Dismissed",
      },
    });
    return { ok: true };
  }

  if (input.action === "warn") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: report.targetUserId },
        data: { warnedAt: now },
      }),
      prisma.report.update({
        where: { id: report.id },
        data: {
          status: "warned",
          reviewedAt: now,
          reviewedById: input.reviewerId,
          actionNote: note || "Warned",
        },
      }),
    ]);
    return { ok: true };
  }

  // Soft-ban — blocks sign-in + posting
  await prisma.$transaction([
    prisma.user.update({
      where: { id: report.targetUserId },
      data: { bannedAt: now },
    }),
    prisma.report.update({
      where: { id: report.id },
      data: {
        status: "banned",
        reviewedAt: now,
        reviewedById: input.reviewerId,
        actionNote: note || "Soft-banned",
      },
    }),
  ]);
  return { ok: true };
}
