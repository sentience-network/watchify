import { NextResponse } from "next/server";
import {
  browseArchiveFreeMovies,
  type FreeCatalogKind,
} from "@/lib/archive-org";
import { FREE_LIBRARY } from "@/lib/free-content";

export const dynamic = "force-dynamic";

function parseKind(raw: string | null): FreeCatalogKind {
  if (raw === "tv" || raw === "movies" || raw === "all") return raw;
  return "all";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") || "24") || 24;
  const q = searchParams.get("q") || "";
  const kind = parseKind(searchParams.get("kind"));
  const includeCurated = searchParams.get("curated") !== "0";

  const browse = await browseArchiveFreeMovies({ page, pageSize, q, kind });

  return NextResponse.json({
    ...browse,
    curated:
      includeCurated && page === 1 && !q.trim() && kind !== "tv"
        ? FREE_LIBRARY
        : [],
    curatedCount: FREE_LIBRARY.length,
    countsHint: {
      curated: FREE_LIBRARY.length,
      archiveKind: kind,
      archiveTotal: browse.total,
    },
  });
}
