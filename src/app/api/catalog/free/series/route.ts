import { NextResponse } from "next/server";
import { listArchiveFreeSeries } from "@/lib/archive-org";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listArchiveFreeSeries();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        series: [],
        totalEpisodes: 0,
        note: "Could not load series catalog.",
        error: e instanceof Error ? e.message : "series_error",
      },
      { status: 502 }
    );
  }
}
