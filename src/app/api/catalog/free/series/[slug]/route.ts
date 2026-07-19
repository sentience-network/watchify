import { NextResponse } from "next/server";
import {
  getArchiveFreeSeries,
  nextEpisodeInSeries,
} from "@/lib/archive-org";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing series slug" }, { status: 400 });
  }

  try {
    const series = await getArchiveFreeSeries(slug);
    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const afterId = searchParams.get("after");
    const next = afterId
      ? nextEpisodeInSeries(series.episodes, afterId)
      : null;

    return NextResponse.json({
      series,
      nextEpisode: next,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "series_error",
      },
      { status: 502 }
    );
  }
}
