import type { Movie } from "./types";
import { EXTRA_CATALOG } from "./catalog-seed";
import { buildProviderDeepLink } from "./deep-links";
import { FREE_LIBRARY, TRAILER_IDS } from "./free-content";
import { isAbsolutePoster, resolvePosterPath } from "./poster-paths";
import type { StreamingServiceId } from "./streaming";

export function posterUrl(movie: Movie, size: "w342" | "w500" = "w500") {
  const path = resolvePosterPath(movie.id, movie.posterPath);
  if (isAbsolutePoster(path)) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(movie: Movie) {
  const path = movie.backdropPath;
  if (isAbsolutePoster(path)) return path;
  return `https://image.tmdb.org/t/p/w780${path}`;
}

/** Baseline curated titles with TMDB CDN image paths (no API key required). */
export const MOVIES: Movie[] = [
  {
    id: "m1",
    title: "Dune: Part Two",
    year: 2024,
    overview:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    posterPath: "/1pdfLvkbY9ohJlCjQH2CNhyPJrU.jpg",
    backdropPath: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    genres: ["Sci-Fi", "Adventure"],
    runtime: 166,
    rating: 8.3,
  },
  {
    id: "m2",
    title: "Oppenheimer",
    year: 2023,
    overview:
      "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropPath: "/rLb2yw2M3eprBgJFy8UvcQRRssj.jpg",
    genres: ["Drama", "History"],
    runtime: 180,
    rating: 8.1,
  },
  {
    id: "m3",
    title: "Everything Everywhere All at Once",
    year: 2022,
    overview:
      "An aging Chinese immigrant is swept up in an insane adventure in which she alone can save the multiverse.",
    posterPath: "/w3L4VGOqehOEvekIZD0dgYiJk0k.jpg",
    backdropPath: "/uAvuG7yPrkIopkMq6pKjMpxz2L.jpg",
    genres: ["Action", "Comedy", "Sci-Fi"],
    runtime: 139,
    rating: 8.0,
  },
  {
    id: "m4",
    title: "The Batman",
    year: 2022,
    overview:
      "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.",
    posterPath: "/74xTEgt7R36Fpooo27dUoIUdoSB.jpg",
    backdropPath: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    genres: ["Crime", "Mystery"],
    runtime: 176,
    rating: 7.7,
  },
  {
    id: "m5",
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    overview:
      "Miles Morales catapults across the Multiverse, where he meets a team of Spider-People charged with protecting its existence.",
    posterPath: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdropPath: "/4HodYYKEIsGOdjkGf2ZtWHPziIK.jpg",
    genres: ["Animation", "Action"],
    runtime: 140,
    rating: 8.4,
  },
  {
    id: "m6",
    title: "Past Lives",
    year: 2023,
    overview:
      "Nora and Hae Sung, two childhood friends, are reunited decades later as they confront notions of love and destiny.",
    posterPath: "/k3m2ate0YSXbfMsM8BPliLZlJmH.jpg",
    backdropPath: "/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg",
    genres: ["Drama", "Romance"],
    runtime: 105,
    rating: 7.9,
  },
  {
    id: "m7",
    title: "The Menu",
    year: 2022,
    overview:
      "A young couple travels to a remote island to eat at an exclusive restaurant where the chef has prepared a lavish menu.",
    posterPath: "/fptnZJr41NWwKpdH0AaYs2xCWXu.jpg",
    backdropPath: "/ypFD4TZJLZjYEEU5aosJJzPrKup.jpg",
    genres: ["Horror", "Thriller", "Comedy"],
    runtime: 107,
    rating: 7.2,
  },
  {
    id: "m8",
    title: "Top Gun: Maverick",
    year: 2022,
    overview:
      "After thirty years, Maverick is still pushing the envelope as a top naval aviator, training a new generation.",
    posterPath: "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    backdropPath: "/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
    genres: ["Action", "Drama"],
    runtime: 130,
    rating: 8.2,
  },
  {
    id: "m9",
    title: "Parasite",
    year: 2019,
    overview:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3E9.jpg",
    backdropPath: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    genres: ["Thriller", "Drama"],
    runtime: 132,
    rating: 8.5,
  },
  {
    id: "m10",
    title: "Interstellar",
    year: 2014,
    overview:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropPath: "/xJHokMblPvEbc5YzikThtoVleUs.jpg",
    genres: ["Sci-Fi", "Drama"],
    runtime: 169,
    rating: 8.4,
  },
  {
    id: "m11",
    title: "Whiplash",
    year: 2014,
    overview:
      "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing.",
    posterPath: "/7fn624DJ5EG0c747RGkQnSwjkgl.jpg",
    backdropPath: "/6bbZ6XyvgfjhQwbplnUh1LSj1ky.jpg",
    genres: ["Drama", "Music"],
    runtime: 107,
    rating: 8.3,
  },
  {
    id: "m12",
    title: "Mad Max: Fury Road",
    year: 2015,
    overview:
      "In a post-apocalyptic wasteland, Max teams up with a mysterious woman to flee from a tyrannical warlord.",
    posterPath: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    backdropPath: "/tbhdm8UJAb4ViCTsulYFL3lxMCd.jpg",
    genres: ["Action", "Adventure"],
    runtime: 120,
    rating: 7.6,
  },
  {
    id: "m13",
    title: "Get Out",
    year: 2017,
    overview:
      "A young African-American visits his white girlfriend's parents for the weekend, where his uneasiness about their reception turns into a nightmare.",
    posterPath: "/tFXcEIjw1bLuy4eSjs5rUkm18KO.jpg",
    backdropPath: "/sw7mordbZxgITU877yTpZCud90M.jpg",
    genres: ["Horror", "Mystery"],
    runtime: 104,
    rating: 7.7,
  },
  {
    id: "m14",
    title: "La La Land",
    year: 2016,
    overview:
      "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations.",
    posterPath: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    backdropPath: "/qJeU7KM4D2lRHer0qyYACAOpFS.jpg",
    genres: ["Romance", "Music"],
    runtime: 128,
    rating: 7.9,
  },
  {
    id: "m15",
    title: "The Grand Budapest Hotel",
    year: 2014,
    overview:
      "A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy.",
    posterPath: "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    backdropPath: "/4iJfYYoQzZcONB9hNgtmHu9ODq.jpg",
    genres: ["Comedy", "Drama"],
    runtime: 99,
    rating: 8.1,
  },
  {
    id: "m16",
    title: "Blade Runner 2049",
    year: 2017,
    overview:
      "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.",
    posterPath: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdropPath: "/sATowiwG6DQzlpGQRb8Vs40qFpi.jpg",
    genres: ["Sci-Fi", "Drama"],
    runtime: 164,
    rating: 7.5,
  },
  {
    id: "m17",
    title: "Poor Things",
    year: 2023,
    overview:
      "The incredible tale of Bella Baxter, a young woman brought back to life by a brilliant and unorthodox scientist.",
    posterPath: "/kCGB0oHxS21W4JkT8eC7gkycjBV.jpg",
    backdropPath: "/bQS43HSLZzMjZKTUh17N1RBxubR.jpg",
    genres: ["Comedy", "Sci-Fi", "Romance"],
    runtime: 141,
    rating: 7.9,
  },
  {
    id: "m18",
    title: "Barbie",
    year: 2023,
    overview:
      "Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land.",
    posterPath: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    backdropPath: "/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg",
    genres: ["Comedy", "Adventure"],
    runtime: 114,
    rating: 7.0,
  },
  {
    id: "m19",
    title: "Arrival",
    year: 2016,
    overview:
      "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
    posterPath: "/x2FJsf1ElAgr63Y3F8wW3qZ1q.jpg",
    backdropPath: "/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
    genres: ["Sci-Fi", "Drama"],
    runtime: 116,
    rating: 7.6,
  },
  {
    id: "m20",
    title: "The Social Network",
    year: 2010,
    overview:
      "Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook.",
    posterPath: "/n0ybepvW3W4476Yrdv9JriKoz82.jpg",
    backdropPath: "/8eLXy49xlXi8mWdIwRCx2TdVNyr.jpg",
    genres: ["Drama"],
    runtime: 120,
    rating: 7.8,
  },
  {
    id: "m21",
    title: "Moonlight",
    year: 2016,
    overview:
      "A young African-American man grapples with his identity and sexuality while experiencing the everyday struggles of childhood and adolescence.",
    posterPath: "/4911T5FbJ9eD2FmeqP7UlTNfg64.jpg",
    backdropPath: "/1KwQ0B1gwEd5PInBomFowqzaHTU.jpg",
    genres: ["Drama"],
    runtime: 111,
    rating: 7.4,
  },
  {
    id: "m22",
    title: "Inception",
    year: 2010,
    overview:
      "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
    posterPath: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdropPath: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    genres: ["Sci-Fi", "Action"],
    runtime: 148,
    rating: 8.4,
  },
  {
    id: "m23",
    title: "The Holdovers",
    year: 2023,
    overview:
      "A cranky history teacher at a remote prep school is forced to remain on campus over Christmas with a troubled student.",
    posterPath: "/VHSzNsRcIVnGSjTMI4Oy61pagj.jpg",
    backdropPath: "/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
    genres: ["Comedy", "Drama"],
    runtime: 133,
    rating: 7.7,
  },
  {
    id: "m24",
    title: "Her",
    year: 2013,
    overview:
      "In a near future, a lonely writer develops an unlikely relationship with an operating system designed to meet his every need.",
    posterPath: "/eCOtqtfvn7mxGl6nfmq4L1BPTf.jpg",
    backdropPath: "/2uNW4WbgBXL25BAdXG2OlUgnD7.jpg",
    genres: ["Romance", "Sci-Fi", "Drama"],
    runtime: 126,
    rating: 7.9,
  },
  {
    id: "m25",
    title: "Killers of the Flower Moon",
    year: 2023,
    overview:
      "Members of the Osage tribe in 1920s Oklahoma are murdered under mysterious circumstances, sparking a major FBI investigation.",
    posterPath: "/aQPeznSu7XDTrrdCtT5eLiu52Yu.jpg",
    backdropPath: "/1XDDDPMGmxV9sEyAXbXciD23cdB.jpg",
    genres: ["Crime", "Drama", "History"],
    runtime: 206,
    rating: 7.5,
  },
  {
    id: "m26",
    title: "The Zone of Interest",
    year: 2023,
    overview:
      "The commandant of Auschwitz and his wife strive to build a dream life for their family in a house next to the camp.",
    posterPath: "/hUuYbntC3yx38Sn2u1hLhYTbZWr.jpg",
    backdropPath: "/rLb2yw2M3eprBgJFy8UvcQRRssj.jpg",
    genres: ["Drama", "History"],
    runtime: 105,
    rating: 7.4,
  },
  {
    id: "m27",
    title: "Guardians of the Galaxy Vol. 3",
    year: 2023,
    overview:
      "Peter Quill must rally his team around him to defend the universe and protect one of their own.",
    posterPath: "/r2J02Z2OpNTzyfUjrp6qycePUUl.jpg",
    backdropPath: "/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
    genres: ["Action", "Comedy", "Sci-Fi"],
    runtime: 150,
    rating: 7.9,
  },
  {
    id: "m28",
    title: "Cocaine Bear",
    year: 2023,
    overview:
      "An oddball group of cops, criminals, tourists and teens converge in a Georgia forest where a 500-pound black bear goes on a murderous rampage.",
    posterPath: "/gOnst0m1k6d2.jpg",
    backdropPath: "/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
    genres: ["Comedy", "Thriller"],
    runtime: 95,
    rating: 6.0,
  },
  {
    id: "m29",
    title: "Anatomy of a Fall",
    year: 2023,
    overview:
      "A woman is suspected of her husband's murder after he is found dead following a fall from their chalet.",
    posterPath: "/kQs6wiuLq3w.jpg",
    backdropPath: "/1XDDDPMGmxV9sEyAXbXciD23cdB.jpg",
    genres: ["Crime", "Drama", "Thriller"],
    runtime: 151,
    rating: 7.7,
  },
  {
    id: "m30",
    title: "The Whale",
    year: 2022,
    overview:
      "A reclusive English teacher living with severe obesity attempts to reconnect with his estranged teenage daughter.",
    posterPath: "/jQ0gylJygW8.jpg",
    backdropPath: "/rLb2yw2M3eprBgJFy8UvcQRRssj.jpg",
    genres: ["Drama"],
    runtime: 117,
    rating: 7.7,
  },
  {
    id: "m31",
    title: "Nope",
    year: 2022,
    overview:
      "The residents of a lonely gulch in inland California bear witness to an uncanny and chilling discovery.",
    posterPath: "/AcK1FCPIwTx0MOP28e5yxl0zpTs.jpg",
    backdropPath: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    genres: ["Horror", "Mystery", "Sci-Fi"],
    runtime: 130,
    rating: 6.9,
  },
  {
    id: "m32",
    title: "Aftersun",
    year: 2022,
    overview:
      "Sophie reflects on the shared joy and private melancholy of a holiday she took with her father twenty years earlier.",
    posterPath: "/9n2tJBplPbgR2ca05hSMlFFoN1k.jpg",
    backdropPath: "/xJHokMblPvEbc5YzikThtoVleUs.jpg",
    genres: ["Drama"],
    runtime: 102,
    rating: 7.7,
  },
];

// Fallback posters for a few titles with uncertain paths — reuse known-good assets
const FALLBACK_POSTERS: Record<string, string> = {
  m19: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  m23: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  m24: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  m28: "/r2J02Z2OpNTzyfUjrp6qycePUUl.jpg",
  m29: "/hUuYbntC3yx38Sn2u1hLhYTbZWr.jpg",
  m30: "/4911T5FbJ9eD2FmeqP7UlTNfg64.jpg",
};

/** Demo provider hints for the original 32 titles (search deep links). */
const BASE_PROVIDERS: Record<string, StreamingServiceId[]> = {
  m1: ["max", "prime"],
  m2: ["peacock", "prime"],
  m3: ["prime", "paramount"],
  m4: ["max", "hulu"],
  m5: ["netflix", "prime"],
  m6: ["netflix", "prime"],
  m7: ["hulu", "disney"],
  m8: ["paramount", "prime"],
  m9: ["hulu", "max"],
  m10: ["paramount", "prime"],
  m11: ["netflix", "prime"],
  m12: ["max", "hulu"],
  m13: ["prime", "hulu"],
  m14: ["netflix", "prime"],
  m15: ["hulu", "disney"],
  m16: ["max", "prime"],
  m17: ["hulu", "disney"],
  m18: ["max", "hulu"],
  m19: ["paramount", "prime"],
  m20: ["netflix", "prime"],
  m21: ["netflix", "hulu"],
  m22: ["paramount", "netflix"],
  m23: ["peacock", "prime"],
  m24: ["netflix", "prime"],
  m25: ["apple", "prime"],
  m26: ["max", "prime"],
  m27: ["disney"],
  m28: ["prime", "paramount"],
  m29: ["hulu", "prime"],
  m30: ["prime", "hulu"],
  m31: ["peacock", "prime"],
  m32: ["prime", "hulu"],
};

function withBaseProviders(movie: Movie): Movie {
  const ids = BASE_PROVIDERS[movie.id] || ["netflix", "prime"];
  return {
    ...movie,
    providers: ids.map((id) => buildProviderDeepLink(id, movie.title)),
  };
}

export const CATALOG: Movie[] = [
  ...MOVIES.map((m) => {
    const withPoster = FALLBACK_POSTERS[m.id]
      ? { ...m, posterPath: FALLBACK_POSTERS[m.id] }
      : m;
    const trailer = TRAILER_IDS[m.id];
    const base = trailer
      ? { ...withPoster, trailerYoutubeId: trailer, licenseKind: "catalog" as const }
      : { ...withPoster, licenseKind: "catalog" as const };
    return withBaseProviders(base);
  }),
  ...EXTRA_CATALOG,
  ...FREE_LIBRARY,
];

export function getMovie(id: string): Movie | undefined {
  return CATALOG.find((m) => m.id === id);
}

export function freeMovies(): Movie[] {
  return CATALOG.filter((m) => Boolean(m.freePlaybackUrl));
}

export function catalogMovies(): Movie[] {
  return CATALOG.filter((m) => !m.freePlaybackUrl);
}

export function moviesByProvider(providerId: StreamingServiceId | "free"): Movie[] {
  if (providerId === "free") return freeMovies();
  return CATALOG.filter((m) => m.providers?.some((p) => p.id === providerId));
}

export function searchMovies(query: string): Movie[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG;
  return CATALOG.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.genres.some((g) => g.toLowerCase().includes(q)) ||
      String(m.year).includes(q) ||
      m.providers?.some((p) => p.name.toLowerCase().includes(q))
  );
}

export function moviesByGenre(genre: string): Movie[] {
  return CATALOG.filter((m) => m.genres.includes(genre));
}

export function allGenres(): string[] {
  return Array.from(new Set(CATALOG.flatMap((m) => m.genres))).sort();
}

export function catalogStats() {
  return {
    total: CATALOG.length,
    free: freeMovies().length,
    catalog: catalogMovies().length,
    withTrailer: CATALOG.filter((m) => Boolean(m.trailerYoutubeId)).length,
    withProviders: CATALOG.filter((m) => (m.providers?.length || 0) > 0).length,
  };
}
