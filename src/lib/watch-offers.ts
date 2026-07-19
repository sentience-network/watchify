/**
 * Where-to-watch + rent/buy partner links.
 * Metadata/deep links only — never proxies streams or stores logins.
 */

import {
  buildProviderDeepLink,
  buildRentalPartnerLink,
  justWatchSearchUrl,
  withAmazonAffiliate,
} from "./deep-links";
import type { StreamingServiceId } from "./streaming";
import type { MovieProvider, OfferKind } from "./types";

const STREAM_PROVIDER_MAP: Record<number, StreamingServiceId> = {
  8: "netflix",
  9: "prime",
  15: "hulu",
  337: "disney",
  1899: "max",
  386: "peacock",
  531: "paramount",
  350: "apple",
};

/** Common TMDB rent/buy provider ids → partner deep-link builders. */
const RENT_BUY_MAP: Record<
  number,
  { id: string; name: string; partner: "amazon" | "apple" | "google" | "vudu" | "youtube" | "microsoft" }
> = {
  10: { id: "amazon", name: "Amazon Video", partner: "amazon" },
  9: { id: "amazon", name: "Amazon Video", partner: "amazon" },
  2: { id: "apple_tv", name: "Apple TV", partner: "apple" },
  3: { id: "google_play", name: "Google Play", partner: "google" },
  7: { id: "vudu", name: "Vudu", partner: "vudu" },
  192: { id: "youtube", name: "YouTube", partner: "youtube" },
  68: { id: "microsoft", name: "Microsoft Store", partner: "microsoft" },
};

type TmdbProviderRow = {
  provider_id: number;
  provider_name: string;
};

export type WatchOffersResult = {
  stream: MovieProvider[];
  rent: MovieProvider[];
  buy: MovieProvider[];
  /** Combined list (stream first, then rent, then buy) for older callers. */
  providers: MovieProvider[];
  watchPageUrl: string | null;
  source: "tmdb" | "fallback" | "unavailable";
  note: string;
};

function queryFor(title: string, year?: number): string {
  return year && year > 0 ? `${title} ${year}` : title;
}

function asOffer(
  base: Omit<MovieProvider, "kind"> & { kind?: OfferKind },
  kind: OfferKind
): MovieProvider {
  return { ...base, kind };
}

export function fallbackRentBuyOffers(
  title: string,
  year?: number
): { rent: MovieProvider[]; buy: MovieProvider[]; watchPageUrl: string } {
  const q = queryFor(title, year);
  const rent: MovieProvider[] = [
    asOffer(
      {
        id: "amazon",
        name: "Amazon Video",
        deepLink: withAmazonAffiliate(
          `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`
        ),
        titleSpecific: false,
      },
      "rent"
    ),
    asOffer(
      {
        id: "apple_tv",
        name: "Apple TV",
        deepLink: buildRentalPartnerLink("apple", q),
        titleSpecific: false,
      },
      "rent"
    ),
    asOffer(
      {
        id: "vudu",
        name: "Vudu",
        deepLink: buildRentalPartnerLink("vudu", q),
        titleSpecific: false,
      },
      "rent"
    ),
  ];
  return {
    rent,
    buy: [],
    watchPageUrl: justWatchSearchUrl(q),
  };
}

function mapRentBuy(
  rows: TmdbProviderRow[] | undefined,
  kind: "rent" | "buy",
  title: string,
  year?: number
): MovieProvider[] {
  const q = queryFor(title, year);
  const seen = new Set<string>();
  const out: MovieProvider[] = [];
  for (const p of rows || []) {
    const mapped = RENT_BUY_MAP[p.provider_id];
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(
      asOffer(
        {
          id: mapped.id,
          name: mapped.name || p.provider_name,
          deepLink: buildRentalPartnerLink(mapped.partner, q),
          titleSpecific: false,
        },
        kind
      )
    );
  }
  return out;
}

export function buildWatchOffersFromTmdb(input: {
  title: string;
  year?: number;
  regionLink?: string | null;
  flatrate?: TmdbProviderRow[];
  ads?: TmdbProviderRow[];
  rent?: TmdbProviderRow[];
  buy?: TmdbProviderRow[];
  region: string;
}): WatchOffersResult {
  const { title, year, region } = input;
  const seenStream = new Set<StreamingServiceId>();
  const stream: MovieProvider[] = [];

  for (const p of [...(input.flatrate || []), ...(input.ads || [])]) {
    const id = STREAM_PROVIDER_MAP[p.provider_id];
    if (!id || seenStream.has(id)) continue;
    seenStream.add(id);
    stream.push(
      asOffer(buildProviderDeepLink(id, title, undefined, year), "stream")
    );
  }

  let rent = mapRentBuy(input.rent, "rent", title, year);
  let buy = mapRentBuy(input.buy, "buy", title, year);

  if (!rent.length && !buy.length) {
    const fb = fallbackRentBuyOffers(title, year);
    rent = fb.rent;
    buy = fb.buy;
  }

  const watchPageUrl =
    input.regionLink?.trim() || justWatchSearchUrl(queryFor(title, year));

  const providers = [...stream, ...rent, ...buy];
  return {
    stream,
    rent,
    buy,
    providers,
    watchPageUrl,
    source: "tmdb",
    note: stream.length
      ? `Live availability from TMDB (${region}). Stream links open your service; Rent/Buy opens partner checkout (Amazon, Apple, etc.).`
      : `No subscription listing for ${region} on TMDB — Rent/Buy partner links and JustWatch still available.`,
  };
}
