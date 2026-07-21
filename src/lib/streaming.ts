/** Legal social attribution only — never proxies streams or stores logins. */

export type StreamingServiceId =
  | "netflix"
  | "disney"
  | "hulu"
  | "max"
  | "prime"
  | "apple"
  | "peacock"
  | "paramount";

export type StreamingService = {
  id: StreamingServiceId;
  name: string;
  shortName: string;
  /** Accent for badges */
  hue: number;
  homeUrl: string;
};

export const STREAMING_SERVICES: StreamingService[] = [
  {
    id: "netflix",
    name: "Netflix",
    shortName: "Netflix",
    hue: 0,
    homeUrl: "https://www.netflix.com",
  },
  {
    id: "disney",
    name: "Disney+",
    shortName: "Disney+",
    hue: 220,
    homeUrl: "https://www.disneyplus.com",
  },
  {
    id: "hulu",
    name: "Hulu",
    shortName: "Hulu",
    hue: 145,
    homeUrl: "https://www.hulu.com",
  },
  {
    id: "max",
    name: "Max",
    shortName: "Max",
    hue: 260,
    homeUrl: "https://www.max.com",
  },
  {
    id: "prime",
    name: "Prime Video",
    shortName: "Prime",
    hue: 200,
    homeUrl: "https://www.amazon.com/gp/video/storefront",
  },
  {
    id: "apple",
    name: "Apple TV+",
    shortName: "Apple TV+",
    hue: 210,
    homeUrl: "https://tv.apple.com",
  },
  {
    id: "peacock",
    name: "Peacock",
    shortName: "Peacock",
    hue: 280,
    homeUrl: "https://www.peacocktv.com",
  },
  {
    id: "paramount",
    name: "Paramount+",
    shortName: "Paramount+",
    hue: 25,
    homeUrl: "https://www.paramountplus.com",
  },
];

export function getStreamingService(
  id: StreamingServiceId | null | undefined
): StreamingService | undefined {
  if (!id) return undefined;
  return STREAMING_SERVICES.find((s) => s.id === id);
}

/** Deep link for people who already subscribe — search, not a pirate mirror. */
export function openOnServiceUrl(
  serviceId: StreamingServiceId,
  title: string,
  year?: number
): string {
  const q = encodeURIComponent(year && year > 0 ? `${title} ${year}` : title);
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

export function isStreamingServiceId(id: string): id is StreamingServiceId {
  return STREAMING_SERVICES.some((s) => s.id === id);
}

/** Where-to-watch hint for friends who may not subscribe. */
export function whereToWatchUrl(title: string): string {
  return `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
}

export const STREAMING_HONEST_COPY =
  "Friends can see what you’re watching and join the party chat — they don’t need your streaming login. To watch the movie itself, each person uses their own account, a Watchify Free title, or a legal community upload — never licensed Netflix (etc.) inside Watchify.";

export const PRODUCT_TRUTH_COPY =
  "Two ways to watch together: (1) sync parties on Netflix/Max/Disney+ via deep links — everyone uses their own login; (2) Watchify-hosted free/legal titles and legal community uploads with real in-app playback. We never claim licensed Netflix in-app.";

export const NO_CREDENTIAL_COPY =
  "Never share your streaming passwords with Watchify or friends. Linking a service only marks that you subscribe — it does not sign into Netflix (or any other streamer) and cannot open your paid library.";

/** Settings + title-page honesty: what “Link” actually does. */
export const LINK_ACCOUNTS_LEAD =
  "Link the services you already pay for. Watchify remembers them for Discover matching and shows Watch on [service] deep links — you stay signed into Netflix (etc.) in your own browser or app, not inside Watchify.";

export const LINK_ACCOUNTS_WHY =
  "Major streamers do not offer public OAuth for third-party apps to play licensed video. Stay signed in on netflix.com / disneyplus.com in this browser, then Watchify opens the right title page when you tap Watch on…";
