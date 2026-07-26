import type { Movie } from "./types";

/**
 * Free Live TV — public broadcasters & openly published free linear streams only.
 * No paid/cable scrapes. HLS URLs are official public endpoints; NASA uses YouTube Live.
 */

export type LiveCategory = "news" | "science" | "lifestyle" | "public";

export type LiveChannel = Movie & {
  isLive: true;
  liveCategory: LiveCategory;
  /** Direct HLS master playlist when available (CORS-friendly public CDNs). */
  hlsUrl?: string;
};

function ytThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

const CHANNELS_BASE: LiveChannel[] = [
  {
    id: "live-nasa",
    title: "NASA TV Public",
    year: new Date().getFullYear(),
    overview:
      "Official NASA Television public channel — launches, mission coverage, and space science. Free government stream via YouTube Live.",
    posterPath: ytThumb("21X5lGlDOfg"),
    backdropPath: ytThumb("21X5lGlDOfg"),
    genres: ["Science", "Live"],
    runtime: 0,
    rating: 0,
    youtubePlaybackId: "21X5lGlDOfg",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "science",
    mediaType: "tv",
    attribution: {
      creator: "NASA",
      license: "Public U.S. government works / NASA TV",
      licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
      sourceUrl: "https://www.nasa.gov/multimedia/nasatv/",
    },
  },
  {
    id: "live-nasa-media",
    title: "NASA TV Media",
    year: new Date().getFullYear(),
    overview:
      "NASA TV media channel — press conferences, mission commentary, and agency briefings. Official free YouTube Live feed.",
    posterPath: ytThumb("nA9UZF-SZoQ"),
    backdropPath: ytThumb("nA9UZF-SZoQ"),
    genres: ["Science", "Live"],
    runtime: 0,
    rating: 0,
    youtubePlaybackId: "nA9UZF-SZoQ",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "science",
    mediaType: "tv",
    attribution: {
      creator: "NASA",
      license: "Public U.S. government works / NASA TV",
      licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
      sourceUrl: "https://www.nasa.gov/multimedia/nasatv/",
    },
  },
  {
    id: "live-dw-en",
    title: "DW English",
    year: new Date().getFullYear(),
    overview:
      "Deutsche Welle’s free English news channel — international reporting published as a public HLS stream.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl:
      "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    freePlaybackUrl:
      "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "Deutsche Welle",
      license: "Free public livestream (DW)",
      licenseUrl: "https://www.dw.com/en/media-center/live-tv/s-100825",
      sourceUrl: "https://www.dw.com/en/live-tv/s-100825",
    },
  },
  {
    id: "live-dw-de",
    title: "DW Deutsch",
    year: new Date().getFullYear(),
    overview:
      "Deutsche Welle German-language news livestream — free public HLS from DW’s CDN.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl:
      "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8",
    freePlaybackUrl:
      "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "Deutsche Welle",
      license: "Free public livestream (DW)",
      licenseUrl: "https://www.dw.com/de/mediathek/live-tv/s-100825",
      sourceUrl: "https://www.dw.com/de/live-tv/s-100825",
    },
  },
  {
    id: "live-dw-ar",
    title: "DW Arabic",
    year: new Date().getFullYear(),
    overview:
      "Deutsche Welle Arabic news livestream — free public HLS from DW’s CDN.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl:
      "https://dwamdstream105.akamaized.net/hls/live/2015531/dwstream105/index.m3u8",
    freePlaybackUrl:
      "https://dwamdstream105.akamaized.net/hls/live/2015531/dwstream105/index.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "Deutsche Welle",
      license: "Free public livestream (DW)",
      licenseUrl: "https://www.dw.com/ar/ميديا-سنتر/مباشر/s-100825",
      sourceUrl: "https://www.dw.com/ar/",
    },
  },
  {
    id: "live-france24-en",
    title: "France 24 English",
    year: new Date().getFullYear(),
    overview:
      "France 24 English — free international news livestream published by France Médias Monde.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    freePlaybackUrl:
      "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "France 24 / France Médias Monde",
      license: "Free public livestream (France 24)",
      licenseUrl: "https://www.france24.com/en/live",
      sourceUrl: "https://www.france24.com/en/live",
    },
  },
  {
    id: "live-france24-fr",
    title: "France 24 Français",
    year: new Date().getFullYear(),
    overview:
      "France 24 French — free news livestream from France Médias Monde.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8",
    freePlaybackUrl:
      "https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "France 24 / France Médias Monde",
      license: "Free public livestream (France 24)",
      licenseUrl: "https://www.france24.com/fr/en-direct",
      sourceUrl: "https://www.france24.com/fr/en-direct",
    },
  },
  {
    id: "live-france24-es",
    title: "France 24 Español",
    year: new Date().getFullYear(),
    overview:
      "France 24 Spanish — free news livestream from France Médias Monde.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8",
    freePlaybackUrl:
      "https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "France 24 / France Médias Monde",
      license: "Free public livestream (France 24)",
      licenseUrl: "https://www.france24.com/es/en-vivo",
      sourceUrl: "https://www.france24.com/es/en-vivo",
    },
  },
  {
    id: "live-france24-ar",
    title: "France 24 Arabic",
    year: new Date().getFullYear(),
    overview:
      "France 24 Arabic — free news livestream from France Médias Monde.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://static.france24.com/live/F24_AR_LO_HLS/live_web.m3u8",
    freePlaybackUrl:
      "https://static.france24.com/live/F24_AR_LO_HLS/live_web.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "France 24 / France Médias Monde",
      license: "Free public livestream (France 24)",
      licenseUrl: "https://www.france24.com/ar/live",
      sourceUrl: "https://www.france24.com/ar/live",
    },
  },
  {
    id: "live-aljazeera-en",
    title: "Al Jazeera English",
    year: new Date().getFullYear(),
    overview:
      "Al Jazeera English free linear news stream — publicly published HLS for web players.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://live-hls-apps-aje.getaj.net/AJE/01.m3u8",
    freePlaybackUrl: "https://live-hls-apps-aje.getaj.net/AJE/01.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "Al Jazeera Media Network",
      license: "Free public livestream (Al Jazeera)",
      licenseUrl: "https://www.aljazeera.com/live",
      sourceUrl: "https://www.aljazeera.com/live",
    },
  },
  {
    id: "live-aljazeera-mubasher",
    title: "Al Jazeera Mubasher",
    year: new Date().getFullYear(),
    overview:
      "Al Jazeera Mubasher — free Arabic live events channel via publicly published HLS.",
    posterPath: "",
    backdropPath: "",
    genres: ["News", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl: "https://live-hls-apps-ajm.getaj.net/AJM/01.m3u8",
    freePlaybackUrl: "https://live-hls-apps-ajm.getaj.net/AJM/01.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "news",
    mediaType: "tv",
    attribution: {
      creator: "Al Jazeera Media Network",
      license: "Free public livestream (Al Jazeera)",
      licenseUrl: "https://www.aljazeera.net/live",
      sourceUrl: "https://www.aljazeera.net/live",
    },
  },
  {
    id: "live-redbull",
    title: "Red Bull TV",
    year: new Date().getFullYear(),
    overview:
      "Red Bull TV free lifestyle & sports linear channel — openly published HLS livestream.",
    posterPath: "",
    backdropPath: "",
    genres: ["Sports", "Lifestyle", "Live"],
    runtime: 0,
    rating: 0,
    hlsUrl:
      "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    freePlaybackUrl:
      "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    licenseKind: "public_broadcast",
    isLive: true,
    liveCategory: "lifestyle",
    mediaType: "tv",
    attribution: {
      creator: "Red Bull Media House",
      license: "Free public livestream (Red Bull TV)",
      licenseUrl: "https://www.redbull.com/int-en/tv",
      sourceUrl: "https://www.redbull.com/int-en/tv",
    },
  },
];

export const LIVE_TV_CHANNELS: LiveChannel[] = CHANNELS_BASE;

export const LIVE_CATEGORY_LABELS: Record<LiveCategory, string> = {
  news: "News",
  science: "Science & space",
  lifestyle: "Lifestyle & sports",
  public: "Public TV",
};

export function isLiveChannelId(id: string | undefined | null): boolean {
  return Boolean(id && id.startsWith("live-"));
}

export function getLiveChannel(id: string): LiveChannel | undefined {
  return LIVE_TV_CHANNELS.find((c) => c.id === id);
}

export function listLiveChannels(category?: LiveCategory | "all"): LiveChannel[] {
  if (!category || category === "all") return [...LIVE_TV_CHANNELS];
  return LIVE_TV_CHANNELS.filter((c) => c.liveCategory === category);
}

export function liveChannelAsMovie(channel: LiveChannel): Movie {
  return channel;
}

/** Hosts allowed for optional same-origin HLS playlist proxy (CORS fallback). */
export const LIVE_HLS_ALLOWLIST_HOSTS = [
  "dwamdstream102.akamaized.net",
  "dwamdstream104.akamaized.net",
  "dwamdstream105.akamaized.net",
  "static.france24.com",
  "live-hls-apps-aje.getaj.net",
  "live-hls-apps-ajm.getaj.net",
  "rbmn-live.akamaized.net",
  "ntv1.akamaized.net",
] as const;

export function isAllowlistedHlsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return (LIVE_HLS_ALLOWLIST_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}
