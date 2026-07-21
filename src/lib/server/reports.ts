import { prisma } from "../db";
import { sanitizeText } from "../sanitize";
import type { UserRole } from "../roles";
import { isStaffRole } from "../roles";

export type { UserRole };
export { isStaffRole };

export type ReportStatus =
  | "open"
  | "dismissed"
  | "warned"
  | "banned"
  | "quarantined";

export type ReportKind = "user" | "video" | "upload";

export type SafetyReport = {
  id: string;
  reporterId: string;
  targetUserId?: string | null;
  targetMovieId?: string | null;
  targetKind: ReportKind;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  actionNote?: string;
};

export async function appendReport(input: {
  reporterId: string;
  targetUserId?: string | null;
  targetMovieId?: string | null;
  targetKind?: ReportKind;
  reason: string;
  details?: string;
}): Promise<SafetyReport | { error: string }> {
  const id = `r_${Math.random().toString(36).slice(2, 10)}`;
  const reporterId = sanitizeText(input.reporterId, 40);
  const targetUserId = input.targetUserId
    ? sanitizeText(input.targetUserId, 40)
    : null;
  const targetMovieId = input.targetMovieId
    ? sanitizeText(input.targetMovieId, 80)
    : null;
  const reason = sanitizeText(input.reason, 80);
  const details = sanitizeText(input.details || "", 1000);
  const targetKind: ReportKind =
    input.targetKind ||
    (targetMovieId ? "video" : "user");

  if (!reason) return { error: "reason is required" };
  if (targetKind === "user" && !targetUserId) {
    return { error: "targetUserId is required for user reports" };
  }
  if (
    (targetKind === "video" || targetKind === "upload") &&
    !targetMovieId &&
    !targetUserId
  ) {
    return { error: "targetMovieId or targetUserId required" };
  }

  try {
    const reporter = await prisma.user.findUnique({ where: { id: reporterId } });
    if (!reporter) {
      const report: SafetyReport = {
        id,
        reporterId,
        targetUserId,
        targetMovieId,
        targetKind,
        reason,
        details,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      console.info(
        "[watchify:report]",
        report.id,
        report.targetKind,
        report.targetUserId || report.targetMovieId,
        report.reason
      );
      return report;
    }

    if (targetUserId) {
      const target = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target && targetKind === "user") {
        return { error: "Target user not found" };
      }
    }

    const row = await prisma.report.create({
      data: {
        id,
        reporterId,
        targetUserId: targetUserId || null,
        targetMovieId,
        targetKind,
        reason,
        details,
        status: "open",
      },
    });
    return {
      id: row.id,
      reporterId: row.reporterId,
      targetUserId: row.targetUserId,
      targetMovieId: row.targetMovieId,
      targetKind: row.targetKind as ReportKind,
      reason: row.reason,
      details: row.details,
      status: row.status as ReportStatus,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (e) {
    const report: SafetyReport = {
      id,
      reporterId,
      targetUserId,
      targetMovieId,
      targetKind,
      reason,
      details,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    console.info(
      "[watchify:report]",
      report.id,
      report.targetKind,
      report.targetUserId || report.targetMovieId,
      report.reason,
      e instanceof Error ? e.message : ""
    );
    return report;
  }
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
    targetKind: r.targetKind as ReportKind,
    targetMovieId: r.targetMovieId,
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
  action: "dismiss" | "warn" | "ban" | "quarantine";
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

  if (input.action === "quarantine") {
    const movieId = report.targetMovieId;
    if (movieId?.startsWith("ugc-")) {
      const uploadId = movieId.slice(4);
      await prisma.userUpload.updateMany({
        where: { id: uploadId },
        data: { status: "quarantined" },
      });
    }
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: "quarantined",
        reviewedAt: now,
        reviewedById: input.reviewerId,
        actionNote: note || "Content quarantined",
      },
    });
    return { ok: true };
  }

  if (!report.targetUserId) {
    return {
      ok: false,
      error: "Warn/ban require a user target — use quarantine for content-only reports",
    };
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
