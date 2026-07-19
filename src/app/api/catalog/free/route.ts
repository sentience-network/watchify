import { NextResponse } from "next/server";
import { browseArchiveFreeMovies } from "@/lib/archive-org";
import { FREE_LIBRARY } from "@/lib/free-content";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") || "24") || 24;
  const q = searchParams.get("q") || "";
  const includeCurated = searchParams.get("curated") !== "0";

  const browse = await browseArchiveFreeMovies({ page, pageSize, q });

  return NextResponse.json({
    ...browse,
    curated:
      includeCurated && page === 1 && !q.trim()
        ? FREE_LIBRARY.map((m) => ({
            ...m,
            genres: m.genres,
          }))
        : [],
    curatedCount: FREE_LIBRARY.length,
  });
}
