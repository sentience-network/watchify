import type { StreamingServiceId } from "./streaming";

export type ProviderDeepLink = {
  id: StreamingServiceId;
  name: string;
  deepLink: string;
  /** True when URL opens a specific title page (not just search). */
  titleSpecific: boolean;
};

const SERVICE_NAMES: Record<StreamingServiceId, string> = {
  netflix: "Netflix",
  disney: "Disney+",
  hulu: "Hulu",
  max: "Max",
  prime: "Prime Video",
  apple: "Apple TV+",
  peacock: "Peacock",
  paramount: "Paramount+",
};

/**
 * Build a working deep link for a streamer.
 * Prefer title-specific IDs when curated; otherwise official search URLs.
 * Exact timestamp into the player is NOT supported by these schemes.
 */
export function buildProviderDeepLink(
  serviceId: StreamingServiceId,
  title: string,
  titleId?: string
): ProviderDeepLink {
  const name = SERVICE_NAMES[serviceId];
  const q = encodeURIComponent(title);

  if (titleId) {
    const specific = titleSpecificUrl(serviceId, titleId);
    if (specific) {
      return { id: serviceId, name, deepLink: specific, titleSpecific: true };
    }
  }

  return {
    id: serviceId,
    name,
    deepLink: searchUrl(serviceId, q),
    titleSpecific: false,
  };
}

function titleSpecificUrl(
  serviceId: StreamingServiceId,
  titleId: string
): string | null {
  switch (serviceId) {
    case "netflix":
      return `https://www.netflix.com/title/${encodeURIComponent(titleId)}`;
    case "max":
      return titleId.startsWith("http")
        ? titleId
        : `https://www.max.com/${titleId.replace(/^\//, "")}`;
    case "hulu":
      return titleId.startsWith("http")
        ? titleId
        : `https://www.hulu.com/${titleId.replace(/^\//, "")}`;
    case "prime":
      return `https://www.amazon.com/gp/video/detail/${encodeURIComponent(titleId)}`;
    case "disney":
      return titleId.startsWith("http")
        ? titleId
        : `https://www.disneyplus.com/${titleId.replace(/^\//, "")}`;
    case "peacock":
      return titleId.startsWith("http")
        ? titleId
        : `https://www.peacocktv.com/watch/playback/vod/${encodeURIComponent(titleId)}`;
    case "paramount":
      return titleId.startsWith("http")
        ? titleId
        : `https://www.paramountplus.com/${titleId.replace(/^\//, "")}`;
    case "apple":
      return titleId.startsWith("http")
        ? titleId
        : `https://tv.apple.com/us/movie/${encodeURIComponent(titleId)}`;
    default:
      return null;
  }
}

function searchUrl(serviceId: StreamingServiceId, q: string): string {
  switch (serviceId) {
    case "netflix":
      return `https://www.netflix.com/search?q=${q}`;
    case "disney":
      return `https://www.disneyplus.com/search/${q}`;
    case "hulu":
      return `https://www.hulu.com/search?q=${q}`;
    case "max":
      return `https://www.max.com/search?q=${q}`;
    case "prime":
      return `https://www.amazon.com/s?k=${q}&i=instant-video`;
    case "apple":
      return `https://tv.apple.com/search?term=${q}`;
    case "peacock":
      return `https://www.peacocktv.com/search?q=${q}`;
    case "paramount":
      return `https://www.paramountplus.com/search/?q=${q}`;
    default:
      return `https://www.justwatch.com/us/search?q=${q}`;
  }
}

export function formatPlayhead(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Honest copy: paid streamers almost never accept a start-time in the URL. */
export const TIMESTAMP_LIMIT_COPY =
  "Most streamers (Netflix, Max, Hulu, etc.) cannot open at an exact timestamp via a link. Watchify joins chat and shows the live party playhead — scrub to that time in your player, or copy the timestamp.";

export const DEMO_CATALOG_NOTE =
  "Demo catalog: curated titles with official search / title deep-link patterns. Availability varies by region. Add TMDB_API_KEY for live watch/providers (metadata only — never scrapes streams).";
