import type { Movie } from "./types";
import { rememberMovies } from "./tmdb";

/** Prefix for Internet Archive–sourced free titles. */
export const IA_ID_PREFIX = "ia-";

const SEARCH_URL = "https://archive.org/advancedsearch.php";

export type FreeCatalogKind = "all" | "movies" | "tv";

/**
 * Public-domain MPEG4 items on Internet Archive (licenseurl:*publicdomain*).
 * Counts move over time; typically ~6k features + ~5k TV/classic_tv.
 */
const FREE_MOVIE_QUERY =
  "collection:feature_films AND mediatype:movies AND format:MPEG4 AND licenseurl:*publicdomain*";

const FREE_TV_QUERY =
  "(collection:classic_tv OR collection:television) AND mediatype:movies AND format:MPEG4 AND licenseurl:*publicdomain* AND NOT title:Commercial AND NOT title:Credits";

const FREE_ALL_QUERY =
  "(collection:feature_films OR collection:classic_tv OR collection:television) AND mediatype:movies AND format:MPEG4 AND licenseurl:*publicdomain*";

function queryForKind(kind: FreeCatalogKind): string {
  if (kind === "tv") return FREE_TV_QUERY;
  if (kind === "movies") return FREE_MOVIE_QUERY;
  return FREE_ALL_QUERY;
}

type IaSearchDoc = {
  identifier?: string;
  title?: string | string[];
  year?: string | number | string[];
  description?: string | string[];
  avg_rating?: number | string;
  runtime?: string | number | string[];
  licenseurl?: string | string[];
};

type IaFile = {
  name: string;
  format?: string;
  size?: string | number;
  source?: string;
};

function asString(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] || "");
  if (v == null) return "";
  return String(v);
}

function asYear(v: unknown): number {
  const s = asString(v);
  const m = s.match(/(18|19|20)\d{2}/);
  if (!m) return 0;
  const y = Number(m[0]);
  return Number.isFinite(y) ? y : 0;
}

function asRuntimeMinutes(v: unknown): number {
  const s = asString(v).trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s);
  const hms = s.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
  if (hms && (hms[1] || hms[2])) {
    return (Number(hms[1] || 0) * 60 || 0) + (Number(hms[2] || 0) || 0);
  }
  const colon = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colon) {
    if (colon[3]) {
      return Number(colon[1]) * 60 + Number(colon[2]);
    }
    return Number(colon[1]);
  }
  return 0;
}

function licenseKindFromUrl(url: string): Movie["licenseKind"] {
  const u = url.toLowerCase();
  if (u.includes("publicdomain") || u.includes("cc0") || u.includes("zero/1.0")) {
    return "public_domain";
  }
  if (u.includes("creativecommons") || u.includes("licenses/by")) {
    return "creative_commons";
  }
  return "public_domain";
}

function isNcLicense(url: string): boolean {
  return /nc|noncommercial|non-commercial/i.test(url);
}

export function parseArchiveCatalogId(
  id: string
): string | null {
  if (!id.startsWith(IA_ID_PREFIX)) return null;
  const identifier = id.slice(IA_ID_PREFIX.length).trim();
  return identifier || null;
}

export function archiveCatalogId(identifier: string): string {
  return `${IA_ID_PREFIX}${identifier}`;
}

export function archivePosterUrl(identifier: string): string {
  return `https://archive.org/services/img/${encodeURIComponent(identifier)}`;
}

export function archiveItemUrl(identifier: string): string {
  return `https://archive.org/details/${encodeURIComponent(identifier)}`;
}

export function archiveEmbedUrl(identifier: string, autoplay = false): string {
  const q = autoplay ? "?autoplay=1" : "";
  return `https://archive.org/embed/${encodeURIComponent(identifier)}${q}`;
}

function docToMovie(doc: IaSearchDoc, kind: FreeCatalogKind): Movie | null {
  const identifier = asString(doc.identifier).trim();
  if (!identifier) return null;
  const license = asString(doc.licenseurl);
  if (license && isNcLicense(license)) return null;

  const title = asString(doc.title).trim() || identifier;
  const year = asYear(doc.year);
  const overview = asString(doc.description).replace(/\s+/g, " ").trim();
  const ratingRaw = Number(asString(doc.avg_rating) || 0);
  const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : 0;
  const poster = archivePosterUrl(identifier);
  const isTv =
    kind === "tv" ||
    /classic_tv|television|episode|series/i.test(identifier + " " + title);

  return {
    id: archiveCatalogId(identifier),
    title,
    year,
    overview:
      overview.slice(0, 600) ||
      (isTv
        ? "Public-domain TV / classic episode from Internet Archive."
        : "Public-domain / libre title from Internet Archive."),
    posterPath: poster,
    backdropPath: poster,
    genres: isTv ? ["Free", "TV", "Archive"] : ["Free", "Movie", "Archive"],
    runtime: asRuntimeMinutes(doc.runtime),
    rating,
    mediaType: isTv ? "tv" : "movie",
    archiveOrgId: identifier,
    licenseKind: licenseKindFromUrl(license),
    attribution: {
      creator: "Internet Archive contributor",
      license: license.includes("creativecommons")
        ? "Creative Commons / Public Domain (via Internet Archive)"
        : "Public Domain (via Internet Archive)",
      licenseUrl: license || "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: archiveItemUrl(identifier),
    },
  };
}

function pickMp4File(files: IaFile[]): string | null {
  const candidates = files.filter((f) => {
    if (!/\.mp4$/i.test(f.name)) return false;
    if (/sample|trailer|sprite|thumb|512kb|ia_thumb|_meta\.|_files\.xml/i.test(f.name)) {
      return false;
    }
    return true;
  });
  if (!candidates.length) {
    const loose = files.find((f) => /\.mp4$/i.test(f.name));
    return loose?.name || null;
  }

  const scored = candidates.map((f) => {
    const size = Number(f.size || 0);
    // Prefer ~80–400MB feature encodes; avoid tiny clips and multi-GB masters when possible
    let score = 0;
    if (size > 8_000_000 && size < 800_000_000) score += 50;
    if (size > 40_000_000 && size < 400_000_000) score += 30;
    if (/h\.?264|mpeg4|512kb|720p|480p/i.test(f.format || f.name)) score += 10;
    if (/1080p|2160p|4k/i.test(f.name)) score -= 5;
    return { name: f.name, score, size };
  });
  scored.sort((a, b) => b.score - a.score || a.size - b.size);
  return scored[0]?.name || null;
}

export type ArchiveBrowseResult = {
  movies: Movie[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  kind: FreeCatalogKind;
  query: string;
  source: "archive.org";
  note: string;
};

export async function browseArchiveFreeMovies(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
  kind?: FreeCatalogKind;
}): Promise<ArchiveBrowseResult> {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(48, Math.max(6, opts.pageSize || 24));
  const userQ = (opts.q || "").trim();
  const kind: FreeCatalogKind =
    opts.kind === "tv" || opts.kind === "movies" || opts.kind === "all"
      ? opts.kind
      : "all";

  const base = queryForKind(kind);
  let query = base;
  if (userQ) {
    const safe = userQ.replace(/[:"()]/g, " ").slice(0, 80);
    query = `(${base}) AND (${safe})`;
  }

  const params = new URLSearchParams({
    q: query,
    output: "json",
    rows: String(pageSize),
    page: String(page),
  });
  for (const fl of [
    "identifier",
    "title",
    "year",
    "description",
    "avg_rating",
    "runtime",
    "licenseurl",
  ]) {
    params.append("fl[]", fl);
  }

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { "User-Agent": "Watchify/1.0 (free catalog; +https://watchify.app)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return {
      movies: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      kind,
      query,
      source: "archive.org",
      note: `Internet Archive search returned ${res.status}.`,
    };
  }

  const data = (await res.json()) as {
    response?: { numFound?: number; docs?: IaSearchDoc[] };
  };
  const total = data.response?.numFound || 0;
  const movies = (data.response?.docs || [])
    .map((d) => docToMovie(d, kind))
    .filter((m): m is Movie => Boolean(m));

  rememberMovies(movies);

  const kindLabel =
    kind === "tv"
      ? "classic TV / television"
      : kind === "movies"
        ? "feature films"
        : "movies + classic TV";

  return {
    movies,
    page,
    pageSize,
    total,
    totalPages: total ? Math.ceil(total / pageSize) : 0,
    kind,
    query,
    source: "archive.org",
    note: `Live Internet Archive public-domain ${kindLabel} (${total.toLocaleString()} with MPEG4 + publicdomain license).`,
  };
}

export async function fetchArchiveTitle(
  catalogIdOrIdentifier: string
): Promise<Movie | null> {
  const identifier =
    parseArchiveCatalogId(catalogIdOrIdentifier) ||
    catalogIdOrIdentifier.replace(/^ia-/i, "");
  if (!identifier || identifier.includes("/")) return null;

  const res = await fetch(
    `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
    {
      headers: { "User-Agent": "Watchify/1.0 (free catalog)" },
      next: { revalidate: 86400 },
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    metadata?: Record<string, unknown>;
    files?: IaFile[];
  };
  const meta = data.metadata || {};
  const license = asString(meta.licenseurl);
  if (license && isNcLicense(license)) return null;

  const title = asString(meta.title).trim() || identifier;
  const year = asYear(meta.year || meta.date);
  const overview = asString(meta.description).replace(/\s+/g, " ").trim();
  const poster = archivePosterUrl(identifier);
  const mp4 = pickMp4File(data.files || []);
  const freePlaybackUrl = mp4
    ? `https://archive.org/download/${encodeURIComponent(identifier)}/${mp4
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : undefined;

  const movie: Movie = {
    id: archiveCatalogId(identifier),
    title,
    year,
    overview:
      overview.slice(0, 800) ||
      "Public-domain / libre title hosted on Internet Archive.",
    posterPath: poster,
    backdropPath: poster,
    genres: ["Free", "Archive"],
    runtime: asRuntimeMinutes(meta.runtime),
    rating: Number(asString(meta.avg_rating) || 0) || 0,
    freePlaybackUrl,
    archiveOrgId: identifier,
    licenseKind: licenseKindFromUrl(license),
    attribution: {
      creator: asString(meta.creator) || "Internet Archive contributor",
      license: license || "Public Domain (via Internet Archive)",
      licenseUrl: license || "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: archiveItemUrl(identifier),
    },
  };

  rememberMovies([movie]);
  return movie;
}
