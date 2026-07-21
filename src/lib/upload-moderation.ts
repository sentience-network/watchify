/**
 * Practical soft-launch upload moderation — keyword + URL/MIME/size heuristics.
 * Not an AI porn scanner; rejects/quarantines obvious violations for human review.
 */

const MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80 MB declared size

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "application/octet-stream", // some browsers on file pick
  "",
]);

/** High-confidence illegal / CSAM / exploitation terms — hard reject. */
const HARD_REJECT = [
  /\bchild\s*porn/i,
  /\bcp\b/i,
  /\bpedo(phile)?\b/i,
  /\bunderage\s*(sex|nude|porn)/i,
  /\bloli(ta)?\s*(porn|hentai|sex)/i,
  /\bcsam\b/i,
  /\brevenge\s*porn\b/i,
  /\bnonconsensual\s*(sex|nude|porn)/i,
];

/** Adult / spam / scam — quarantine for mod (not auto-approve). */
const QUARANTINE = [
  /\bporn\b/i,
  /\bxxx\b/i,
  /\bonlyfans\b/i,
  /\bnude\b/i,
  /\bnudes\b/i,
  /\bnsfw\b/i,
  /\bhentai\b/i,
  /\bsex\s*tape\b/i,
  /\berotic\b/i,
  /\bstrip(ping|per)?\b/i,
  /\bfree\s*netflix\b/i,
  /\bcrack\s*(stream|account)\b/i,
  /\bpirat(e|ed|ing)\b/i,
  /\bcamrip\b/i,
  /\bwarez\b/i,
];

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v)(\?|$)/i;

export type ModerationVerdict = {
  status: "pending" | "approved" | "quarantined" | "rejected";
  flags: string[];
};

export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").slice(0, 20);
      return /^[\w-]{6,20}$/.test(id) ? id : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{6,20}$/.test(v)) return v;
      const embed = u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,20})/);
      if (embed) return embed[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function moderateUploadText(title: string, description: string): ModerationVerdict {
  const blob = `${title}\n${description}`;
  const flags: string[] = [];

  for (const re of HARD_REJECT) {
    if (re.test(blob)) {
      flags.push(`hard:${re.source}`);
      return { status: "rejected", flags };
    }
  }
  for (const re of QUARANTINE) {
    if (re.test(blob)) flags.push(`flag:${re.source}`);
  }
  if (flags.length) return { status: "quarantined", flags };
  return { status: "pending", flags: [] };
}

export function moderateUploadMedia(input: {
  sourceUrl: string;
  mimeHint?: string;
  sizeBytes?: number | null;
}): ModerationVerdict {
  const flags: string[] = [];
  let url: URL;
  try {
    url = new URL(input.sourceUrl.trim());
  } catch {
    return { status: "rejected", flags: ["invalid_url"] };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { status: "rejected", flags: ["bad_protocol"] };
  }

  const mime = (input.mimeHint || "").toLowerCase().split(";")[0].trim();
  if (mime && !ALLOWED_MIME.has(mime) && !mime.startsWith("video/")) {
    flags.push("mime_not_video");
  }

  if (
    input.sizeBytes != null &&
    Number.isFinite(input.sizeBytes) &&
    input.sizeBytes > MAX_SIZE_BYTES
  ) {
    return { status: "rejected", flags: ["file_too_large"] };
  }

  const yt = extractYoutubeId(input.sourceUrl);
  const looksVideo =
    Boolean(yt) ||
    VIDEO_EXT.test(url.pathname) ||
    url.hostname.includes("archive.org") ||
    url.hostname.includes("wikimedia.org") ||
    (mime.startsWith("video/") && Boolean(mime));

  if (!looksVideo && !mime.startsWith("video/")) {
    flags.push("url_not_clearly_video");
  }

  if (flags.includes("mime_not_video")) {
    return { status: "rejected", flags };
  }
  if (flags.length) return { status: "quarantined", flags };
  // Link looks sane — pending for light human glance; auto-approve clean YouTube/Archive.
  if (yt || url.hostname.includes("archive.org")) {
    return { status: "approved", flags: [] };
  }
  return { status: "pending", flags: [] };
}

export function combineVerdicts(...parts: ModerationVerdict[]): ModerationVerdict {
  const flags = parts.flatMap((p) => p.flags);
  if (parts.some((p) => p.status === "rejected")) {
    return { status: "rejected", flags };
  }
  if (parts.some((p) => p.status === "quarantined")) {
    return { status: "quarantined", flags };
  }
  if (parts.every((p) => p.status === "approved")) {
    return { status: "approved", flags };
  }
  return { status: "pending", flags };
}

export const UPLOAD_MAX_SIZE_BYTES = MAX_SIZE_BYTES;
