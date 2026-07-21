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

export type RentalPartnerId =
  | "amazon"
  | "apple"
  | "google"
  | "vudu"
  | "youtube"
  | "microsoft";

function searchQuery(title: string, year?: number): string {
  return year && year > 0 ? `${title} ${year}` : title;
}

/**
 * Build a working deep link for a streamer.
 * Prefer title-specific IDs when curated; otherwise official search URLs.
 * Exact timestamp into the player is NOT supported by these schemes.
 */
export function buildProviderDeepLink(
  serviceId: StreamingServiceId,
  title: string,
  titleId?: string,
  year?: number
): ProviderDeepLink {
  const name = SERVICE_NAMES[serviceId];
  const q = encodeURIComponent(searchQuery(title, year));

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
      return withAmazonAffiliate(
        `https://www.amazon.com/gp/video/detail/${encodeURIComponent(titleId)}`
      );
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
      return `https://www.disneyplus.com/search?q=${q}`;
    case "hulu":
      return `https://www.hulu.com/search?q=${q}`;
    case "max":
      return `https://www.max.com/search?q=${q}`;
    case "prime":
      return withAmazonAffiliate(
        `https://www.amazon.com/s?k=${q}&i=instant-video`
      );
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

/** Optional Amazon Associates tag from env (server or NEXT_PUBLIC). */
export function withAmazonAffiliate(url: string): string {
  const tag =
    process.env.AMAZON_AFFILIATE_TAG?.trim() ||
    process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG?.trim();
  if (!tag) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("amazon.")) return url;
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}

/** Rent/buy partner search — opens partner checkout, not Watchify billing. */
export function buildRentalPartnerLink(
  partner: RentalPartnerId,
  query: string
): string {
  const q = encodeURIComponent(query);
  switch (partner) {
    case "amazon":
      return withAmazonAffiliate(
        `https://www.amazon.com/s?k=${q}&i=instant-video`
      );
    case "apple":
      return `https://tv.apple.com/search?term=${q}`;
    case "google":
      return `https://play.google.com/store/search?q=${q}&c=movies`;
    case "vudu":
      return `https://www.vudu.com/content/movies/search?searchString=${q}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${q}+movie+rent`;
    case "microsoft":
      return `https://www.microsoft.com/store/search?q=${q}`;
    default:
      return justWatchSearchUrl(query);
  }
}

export function justWatchSearchUrl(query: string): string {
  return `https://www.justwatch.com/us/search?q=${encodeURIComponent(query)}`;
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

/** Suggested scrub time from host start + optional manual playhead. */
export function suggestedJoinPlayheadSec(
  watchStartedAt: string | null | undefined,
  positionSec: number,
  playing: boolean,
  nowMs = Date.now()
): number {
  if (watchStartedAt && playing) {
    const elapsed = Math.max(
      0,
      Math.floor((nowMs - new Date(watchStartedAt).getTime()) / 1000)
    );
    return Math.max(positionSec, elapsed);
  }
  return Math.max(0, positionSec);
}

export function formatWatchStartedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeStarted(iso: string | null | undefined): string {
  if (!iso) return "";
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  );
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Estimate where someone is in a title from start time + optional progress %. */
export function estimateWatchPosition(opts: {
  watchingStartedAt?: string | null;
  progressPercent?: number | null;
  runtimeMinutes?: number | null;
  nowMs?: number;
}): { elapsedSec: number; percent: number | null; label: string } {
  const now = opts.nowMs ?? Date.now();
  const runtimeSec =
    opts.runtimeMinutes && opts.runtimeMinutes > 0
      ? opts.runtimeMinutes * 60
      : null;

  let elapsedSec = 0;
  if (opts.watchingStartedAt) {
    elapsedSec = Math.max(
      0,
      Math.floor((now - new Date(opts.watchingStartedAt).getTime()) / 1000)
    );
  }

  let percent: number | null =
    typeof opts.progressPercent === "number" ? opts.progressPercent : null;

  if (percent === null && runtimeSec && opts.watchingStartedAt) {
    percent = Math.min(99, Math.round((elapsedSec / runtimeSec) * 100));
  }

  if (percent !== null && runtimeSec && !opts.watchingStartedAt) {
    elapsedSec = Math.round((percent / 100) * runtimeSec);
  }

  const label =
    elapsedSec > 0
      ? `~${formatPlayhead(elapsedSec)} in`
      : percent !== null
        ? `~${percent}% in`
        : "Just started";

  return { elapsedSec, percent, label };
}

/** Honest copy: paid streamers almost never accept a start-time in the URL. */
export const TIMESTAMP_LIMIT_COPY =
  "Most streamers (Netflix, Max, Hulu, etc.) cannot open at an exact timestamp via a link. Watchify joins chat and shows the live party playhead — scrub to that time in your player, or copy the timestamp.";

export const DEMO_CATALOG_NOTE =
  "Demo catalog: curated titles with official search / title deep-link patterns. Availability varies by region. Add TMDB_API_KEY for live watch/providers (metadata only — never scrapes streams).";

export const RENT_BUY_COPY =
  "Rent or buy opens Amazon, Apple TV, Vudu, and other partners in a new tab — you complete checkout on their site. Watchify does not host paid studio films or charge rentals itself.";
