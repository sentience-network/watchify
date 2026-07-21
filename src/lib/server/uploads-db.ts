import { prisma } from "../db";
import { sanitizeText } from "../sanitize";
import type { Movie } from "../types";
import {
  combineVerdicts,
  extractYoutubeId,
  moderateUploadMedia,
  moderateUploadText,
  UPLOAD_MAX_SIZE_BYTES,
} from "../upload-moderation";

export function uploadCatalogId(uploadId: string) {
  return `ugc-${uploadId}`;
}

export function parseUploadCatalogId(id: string): string | null {
  if (!id.startsWith("ugc-")) return null;
  const rest = id.slice(4);
  return rest || null;
}

function mapUploadToMovie(row: {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  youtubeId: string | null;
  ownerId: string;
  status: string;
}): Movie | null {
  if (row.status !== "approved") return null;
  const yt = row.youtubeId || extractYoutubeId(row.sourceUrl);
  const direct =
    !yt && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(row.sourceUrl)
      ? row.sourceUrl
      : undefined;
  return {
    id: uploadCatalogId(row.id),
    title: row.title,
    year: new Date().getFullYear(),
    overview: row.description || "Community upload — legal non-licensed media only.",
    posterPath: yt
      ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
      : "/poster-fallback.svg",
    backdropPath: "",
    genres: ["Community"],
    runtime: 0,
    rating: 0,
    youtubePlaybackId: yt || undefined,
    freePlaybackUrl: direct,
    licenseKind: "creative_commons",
    attribution: {
      creator: `uploader:${row.ownerId}`,
      license: "Uploader-declared legal / non-licensed",
      licenseUrl: "/content",
      sourceUrl: row.sourceUrl,
    },
  };
}

export async function fetchApprovedUploadMovie(
  catalogId: string
): Promise<Movie | null> {
  const uploadId = parseUploadCatalogId(catalogId);
  if (!uploadId) return null;
  const row = await prisma.userUpload.findUnique({ where: { id: uploadId } });
  if (!row) return null;
  return mapUploadToMovie(row);
}

export async function listApprovedUploadMovies(limit = 24): Promise<Movie[]> {
  const rows = await prisma.userUpload.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 48),
  });
  return rows
    .map(mapUploadToMovie)
    .filter((m): m is Movie => Boolean(m));
}

export async function createUserUpload(input: {
  ownerId: string;
  title: string;
  description?: string;
  sourceUrl: string;
  mimeHint?: string;
  sizeBytes?: number | null;
}) {
  const title = sanitizeText(input.title, 120);
  const description = sanitizeText(input.description || "", 2000);
  const sourceUrl = sanitizeText(input.sourceUrl, 2000);
  if (!title || !sourceUrl) {
    return { error: "Title and source URL are required" as const };
  }

  const textV = moderateUploadText(title, description);
  const mediaV = moderateUploadMedia({
    sourceUrl,
    mimeHint: input.mimeHint,
    sizeBytes: input.sizeBytes,
  });
  const verdict = combineVerdicts(textV, mediaV);

  if (
    input.sizeBytes != null &&
    input.sizeBytes > UPLOAD_MAX_SIZE_BYTES
  ) {
    return {
      error: `File too large (max ${Math.round(UPLOAD_MAX_SIZE_BYTES / (1024 * 1024))} MB)` as const,
    };
  }

  if (verdict.status === "rejected") {
    return {
      error: "Upload rejected by safety checks (illegal or clearly disallowed content)." as const,
      flags: verdict.flags,
    };
  }

  const youtubeId = extractYoutubeId(sourceUrl);
  const row = await prisma.userUpload.create({
    data: {
      ownerId: input.ownerId,
      title,
      description,
      sourceUrl,
      youtubeId,
      mimeHint: sanitizeText(input.mimeHint || "", 80),
      sizeBytes: input.sizeBytes ?? null,
      status: verdict.status,
      flagReasonsJson: JSON.stringify(verdict.flags),
    },
  });

  return {
    ok: true as const,
    upload: {
      id: row.id,
      catalogId: uploadCatalogId(row.id),
      title: row.title,
      status: row.status,
      flags: verdict.flags,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

export async function listUploadsForAdmin(opts?: {
  status?: string;
  limit?: number;
}) {
  const status = opts?.status;
  const limit = Math.min(opts?.limit || 50, 100);
  return prisma.userUpload.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      owner: { select: { id: true, name: true, handle: true, email: true } },
    },
  });
}

export async function moderateUploadStatus(input: {
  uploadId: string;
  reviewerId: string;
  action: "approve" | "quarantine" | "reject";
  note?: string;
}) {
  const status =
    input.action === "approve"
      ? "approved"
      : input.action === "quarantine"
        ? "quarantined"
        : "rejected";
  const row = await prisma.userUpload.findUnique({
    where: { id: input.uploadId },
  });
  if (!row) return { ok: false as const, error: "Upload not found" };

  await prisma.userUpload.update({
    where: { id: row.id },
    data: {
      status,
      flagReasonsJson: JSON.stringify([
        ...JSON.parse(row.flagReasonsJson || "[]"),
        `mod:${input.action}:${sanitizeText(input.note || "", 200)}`,
      ]),
    },
  });
  return { ok: true as const };
}
