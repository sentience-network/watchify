import type { StreamingServiceId } from "./streaming";
import { buildProviderDeepLink } from "./deep-links";
import type { MovieProvider } from "./types";

const TMDB_PROVIDER_MAP: Record<number, StreamingServiceId> = {
  8: "netflix",
  9: "prime",
  15: "hulu",
  337: "disney",
  1899: "max",
  386: "peacock",
  531: "paramount",
  350: "apple",
};

export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

/**
 * Live watch/providers from TMDB (metadata only).
 * Never scrapes streams. Graceful when TMDB_API_KEY is missing.
 */
export async function fetchTmdbWatchProviders(
  tmdbId: number,
  title: string,
  region = "US"
): Promise<{ providers: MovieProvider[]; source: "tmdb" | "unavailable"; note: string }> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    return {
      providers: [],
      source: "unavailable",
      note: "TMDB_API_KEY not set — using curated demo deep links.",
    };
  }

  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return {
        providers: [],
        source: "unavailable",
        note: `TMDB returned ${res.status} — falling back to curated links.`,
      };
    }
    const data = (await res.json()) as {
      results?: Record<string, { flatrate?: { provider_id: number; provider_name: string }[] }>;
    };
    const flat = data.results?.[region]?.flatrate || [];
    const seen = new Set<StreamingServiceId>();
    const providers: MovieProvider[] = [];
    for (const p of flat) {
      const id = TMDB_PROVIDER_MAP[p.provider_id];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      providers.push(buildProviderDeepLink(id, title));
    }
    return {
      providers,
      source: "tmdb",
      note: providers.length
        ? `Live watch/providers from TMDB (${region}). Deep links open the service — timestamps are not in the URL.`
        : `No flatrate providers listed for ${region} on TMDB.`,
    };
  } catch {
    return {
      providers: [],
      source: "unavailable",
      note: "TMDB request failed — using curated demo deep links.",
    };
  }
}
