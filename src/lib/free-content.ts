import type { Movie } from "./types";

/**
 * Watchify free library — public domain / Creative Commons only.
 * Prefer YouTube embeds of rights-cleared / PD uploads (hotlink MP4s rot often).
 * Never paid-streamer scrapes.
 */
const FREE_LIBRARY_BASE: Movie[] = [
  {
    id: "free1",
    title: "Big Buck Bunny",
    year: 2008,
    overview:
      "A Creative Commons animated short from the Blender Foundation — playable on Watchify for free.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/440px-Big_buck_bunny_poster_big.jpg",
    backdropPath: "/rLb2yw2M3eprBgJFy8UvcQRRssj.jpg",
    genres: ["Animation", "Comedy"],
    runtime: 10,
    rating: 7.5,
    trailerYoutubeId: "aqz-KE-bpKQ",
    youtubePlaybackId: "aqz-KE-bpKQ",
    freePlaybackUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      sourceUrl: "https://peach.blender.org/",
    },
  },
  {
    id: "free2",
    title: "Elephants Dream",
    year: 2006,
    overview:
      "The first Blender open movie — Creative Commons, suitable for in-app playback and party sync.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_both.jpg/440px-Elephants_Dream_s5_both.jpg",
    backdropPath: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    genres: ["Animation", "Sci-Fi"],
    runtime: 11,
    rating: 7.0,
    trailerYoutubeId: "TLkA0RELQ1g",
    youtubePlaybackId: "TLkA0RELQ1g",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation",
      license: "CC BY 2.5",
      licenseUrl: "https://creativecommons.org/licenses/by/2.5/",
      sourceUrl: "https://orange.blender.org/",
    },
  },
  {
    id: "free3",
    title: "Sintel",
    year: 2010,
    overview:
      "A Blender Foundation open movie (CC BY) for Watchify free parties with real synced playback.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Sintel_poster.jpg/440px-Sintel_poster.jpg",
    backdropPath: "/uAvuG7yPrkIopkMq6pKjMpxz2L.jpg",
    genres: ["Animation", "Fantasy"],
    runtime: 15,
    rating: 7.8,
    trailerYoutubeId: "eRsGyueVLvQ",
    youtubePlaybackId: "eRsGyueVLvQ",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      sourceUrl: "https://durian.blender.org/",
    },
  },
  {
    id: "free5",
    title: "Tears of Steel",
    year: 2012,
    overview:
      "A live-action science-fiction short released as an open movie by the Blender Foundation.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tears_of_Steel_poster.jpg/440px-Tears_of_Steel_poster.jpg",
    backdropPath: "/xJHokMblPvEbc5YzikThtoVleUs.jpg",
    genres: ["Sci-Fi", "Short"],
    runtime: 12,
    rating: 6.8,
    trailerYoutubeId: "41hv2tW5Lc4",
    youtubePlaybackId: "41hv2tW5Lc4",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      sourceUrl: "https://mango.blender.org/",
    },
  },
  {
    id: "free12",
    title: "Night of the Living Dead",
    year: 1968,
    overview:
      "George A. Romero’s landmark horror film — U.S. public domain; played via a Public Domain Films YouTube upload.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Night_of_the_Living_Dead_%281968%29_theatrical_poster.jpg/440px-Night_of_the_Living_Dead_%281968%29_theatrical_poster.jpg",
    backdropPath: "/sw7mordbZxgITU877yTpZCud90M.jpg",
    genres: ["Horror"],
    runtime: 96,
    rating: 7.8,
    trailerYoutubeId: "MQ8ZKw7YIfQ",
    youtubePlaybackId: "MQ8ZKw7YIfQ",
    licenseKind: "public_domain",
    attribution: {
      creator: "George A. Romero / Image Ten",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/night_of_the_living_dead",
    },
  },
  {
    id: "free13",
    title: "Nosferatu",
    year: 1922,
    overview:
      "F. W. Murnau’s silent vampire classic — public domain in the U.S.; YouTube Cult Cinema Classics upload.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Nosferatu_shadow.jpg/440px-Nosferatu_shadow.jpg",
    backdropPath: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    genres: ["Horror", "Silent"],
    runtime: 94,
    rating: 7.9,
    trailerYoutubeId: "Ydxl9Gi2jIM",
    youtubePlaybackId: "Ydxl9Gi2jIM",
    licenseKind: "public_domain",
    attribution: {
      creator: "F. W. Murnau / Prana Film",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/Nosferatu_201303",
    },
  },
  {
    id: "free14",
    title: "Plan 9 from Outer Space",
    year: 1957,
    overview:
      "Ed Wood’s infamous sci-fi — widely treated as public domain in the U.S.; free YouTube playback.",
    posterPath: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    backdropPath: "/tbhdm8UJAb4ViCTsulYFL3lxMCd.jpg",
    genres: ["Sci-Fi", "Comedy"],
    runtime: 79,
    rating: 4.0,
    trailerYoutubeId: "M2EdYGSk1VE",
    youtubePlaybackId: "M2EdYGSk1VE",
    licenseKind: "public_domain",
    attribution: {
      creator: "Edward D. Wood Jr.",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/Plan9FromOuterSpace",
    },
  },
  {
    id: "free15",
    title: "His Girl Friday",
    year: 1940,
    overview:
      "Howard Hawks screwball comedy classic — U.S. public domain; free full-film YouTube playback.",
    posterPath: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    backdropPath: "/qJeU7KM4D2lRHer0qyYACAOpFS.jpg",
    genres: ["Comedy", "Romance"],
    runtime: 92,
    rating: 7.8,
    trailerYoutubeId: "kmYcT5gT6a4",
    youtubePlaybackId: "kmYcT5gT6a4",
    licenseKind: "public_domain",
    attribution: {
      creator: "Howard Hawks / Columbia Pictures",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/his_girl_friday",
    },
  },
  {
    id: "free16",
    title: "Charade",
    year: 1963,
    overview:
      "Cary Grant & Audrey Hepburn thriller-comedy — U.S. public domain for lack of copyright notice.",
    posterPath: "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    backdropPath: "/4iJfYYoQzZcONB9hNgtmHu9ODq.jpg",
    genres: ["Comedy", "Mystery", "Romance"],
    runtime: 113,
    rating: 7.7,
    trailerYoutubeId: "dsY8kJp_-wA",
    youtubePlaybackId: "dsY8kJp_-wA",
    licenseKind: "public_domain",
    attribution: {
      creator: "Stanley Donen",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/charade1963",
    },
  },
  {
    id: "free17",
    title: "The Phantom of the Opera",
    year: 1925,
    overview:
      "Lon Chaney silent classic — public domain; free full-film YouTube playback.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Phantom_of_the_Opera_%281925_film%29_poster.jpg/440px-Phantom_of_the_Opera_%281925_film%29_poster.jpg",
    backdropPath: "/8eLXy49xlXi8mWdIwRCx2TdVNyr.jpg",
    genres: ["Horror", "Silent"],
    runtime: 93,
    rating: 7.6,
    trailerYoutubeId: "w1gW1pnKBPI",
    youtubePlaybackId: "w1gW1pnKBPI",
    licenseKind: "public_domain",
    attribution: {
      creator: "Universal Pictures / Rupert Julian",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/ThePhantomOfTheOpera1925",
    },
  },
  {
    id: "free18",
    title: "Detour",
    year: 1945,
    overview:
      "Edgar G. Ulmer noir — U.S. public domain; classic poverty-row thriller.",
    posterPath:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Detour_%281945_film%29_poster.jpg/440px-Detour_%281945_film%29_poster.jpg",
    backdropPath: "/1KwQ0B1gwEd5PInBomFowqzaHTU.jpg",
    genres: ["Crime", "Noir"],
    runtime: 67,
    rating: 7.3,
    trailerYoutubeId: "QJN1oxtqxdM",
    youtubePlaybackId: "QJN1oxtqxdM",
    licenseKind: "public_domain",
    attribution: {
      creator: "Edgar G. Ulmer / PRC",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/detour_1945",
    },
  },
  {
    id: "free19",
    title: "Spring",
    year: 2019,
    overview:
      "A shepherd girl and her dog face ancient spirits — Blender Studio open movie (CC BY).",
    posterPath: "",
    backdropPath: "",
    genres: ["Animation", "Fantasy"],
    runtime: 8,
    rating: 8.2,
    trailerYoutubeId: "WhWc3b3KhnY",
    youtubePlaybackId: "WhWc3b3KhnY",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation / Blender Studio",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://studio.blender.org/films/spring/",
    },
  },
  {
    id: "free20",
    title: "Wing It!",
    year: 2023,
    overview:
      "An uptight engineer and a wannabe pilot launch into chaos — Blender Studio open short (CC).",
    posterPath: "",
    backdropPath: "",
    genres: ["Animation", "Comedy"],
    runtime: 4,
    rating: 7.6,
    trailerYoutubeId: "u9lj-c29dxI",
    youtubePlaybackId: "u9lj-c29dxI",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation / Blender Studio",
      license: "CC BY",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://studio.blender.org/",
    },
  },
  {
    id: "free21",
    title: "Agent 327: Operation Barbershop",
    year: 2017,
    overview:
      "Blender Studio’s spy-comedy short — open movie teaser for Agent 327.",
    posterPath: "",
    backdropPath: "",
    genres: ["Animation", "Action", "Comedy"],
    runtime: 4,
    rating: 7.8,
    trailerYoutubeId: "mN0zPOpADL4",
    youtubePlaybackId: "mN0zPOpADL4",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation / Blender Studio",
      license: "CC BY",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://studio.blender.org/",
    },
  },
  {
    id: "free22",
    title: "Coffee Run",
    year: 2020,
    overview:
      "A delivery girl races through a cyberpunk city — Blender Studio open movie short.",
    posterPath: "",
    backdropPath: "",
    genres: ["Animation", "Sci-Fi"],
    runtime: 3,
    rating: 7.4,
    trailerYoutubeId: "PVGeM40dABA",
    youtubePlaybackId: "PVGeM40dABA",
    licenseKind: "creative_commons",
    attribution: {
      creator: "Blender Foundation / Blender Studio",
      license: "CC BY",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://studio.blender.org/",
    },
  },
  {
    id: "free23",
    title: "Metropolis",
    year: 1927,
    overview:
      "Fritz Lang’s silent sci-fi epic — U.S. public domain for the original 1927 work.",
    posterPath: "",
    backdropPath: "",
    genres: ["Sci-Fi", "Silent", "Drama"],
    runtime: 148,
    rating: 8.3,
    trailerYoutubeId: "enwB5zZfaV4",
    youtubePlaybackId: "enwB5zZfaV4",
    licenseKind: "public_domain",
    attribution: {
      creator: "Fritz Lang / UFA",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/Metropolis1927",
    },
  },
  {
    id: "free24",
    title: "Steamboat Bill, Jr.",
    year: 1928,
    overview:
      "Buster Keaton silent comedy classic — public domain; includes the famous cyclone house gag.",
    posterPath: "",
    backdropPath: "",
    genres: ["Comedy", "Silent"],
    runtime: 70,
    rating: 7.9,
    trailerYoutubeId: "eu0MxIWwIjc",
    youtubePlaybackId: "eu0MxIWwIjc",
    licenseKind: "public_domain",
    attribution: {
      creator: "Buster Keaton / United Artists",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/SteamboatBillJr",
    },
  },
  {
    id: "free25",
    title: "Carnival of Souls",
    year: 1962,
    overview:
      "Cult horror about a woman haunted after a car crash — U.S. public domain.",
    posterPath: "",
    backdropPath: "",
    genres: ["Horror", "Mystery"],
    runtime: 78,
    rating: 7.1,
    trailerYoutubeId: "QJ96I8raMT0",
    youtubePlaybackId: "QJ96I8raMT0",
    licenseKind: "public_domain",
    attribution: {
      creator: "Herk Harvey",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/CarnivalOfSouls1962",
    },
  },
  {
    id: "free26",
    title: "Dementia 13",
    year: 1963,
    overview:
      "Francis Ford Coppola’s early gothic horror — widely treated as public domain in the U.S.",
    posterPath: "",
    backdropPath: "",
    genres: ["Horror", "Thriller"],
    runtime: 75,
    rating: 6.1,
    trailerYoutubeId: "EvjYwBGgqj4",
    youtubePlaybackId: "EvjYwBGgqj4",
    licenseKind: "public_domain",
    attribution: {
      creator: "Francis Ford Coppola / American International Pictures",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/Dementia_13",
    },
  },
  {
    id: "free27",
    title: "The Cabinet of Dr. Caligari",
    year: 1920,
    overview:
      "German Expressionist silent horror landmark — public domain in the U.S.",
    posterPath: "",
    backdropPath: "",
    genres: ["Horror", "Silent"],
    runtime: 67,
    rating: 8.0,
    trailerYoutubeId: "zV00ylxcwXw",
    youtubePlaybackId: "zV00ylxcwXw",
    licenseKind: "public_domain",
    attribution: {
      creator: "Robert Wiene / Decla-Bioscop",
      license: "Public Domain (US)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl: "https://archive.org/details/TheCabinetOfDrCaligari",
    },
  },
];

function youtubeThumb(id: string, quality: "hq" | "max" = "hq"): string {
  return quality === "max"
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
    : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Free library with working YouTube preview thumbnails (Wikimedia poster hotlinks were 400ing). */
export const FREE_LIBRARY: Movie[] = FREE_LIBRARY_BASE.map((m) => {
  const yt = m.youtubePlaybackId || m.trailerYoutubeId;
  if (!yt) return m;
  return {
    ...m,
    posterPath: youtubeThumb(yt, "hq"),
    backdropPath: youtubeThumb(yt, "max"),
  };
});

/** Known official trailer YouTube IDs for catalog titles (embed only). */
export const TRAILER_IDS: Record<string, string> = {
  m1: "Way9DawtxQY",
  m2: "uYPbbksJxIg",
  m3: "wxN1T1uwQks",
  m4: "mqqft2x_Aa4",
  m5: "TcMBFSGVi1c",
  m6: "kA159c5nJUQ",
  m7: "C_uTkUGcNiQ",
  m8: "giXco2jaZ_4",
  m9: "5xH0HfJHsaY",
  m10: "zSWdZVtXT7E",
  m11: "7d_jQycdQGo",
  m12: "hEJnMQG9ev8",
  m13: "sRfnevzM9kQ",
  m14: "0pdqf4P9MB8",
  m15: "1Fg5QViGEF8",
  m16: "gCcx85zbxz4",
  m17: "R0DQxwctqUc",
  m18: "pBk4NYhWNMM",
  m19: "tFMo3UJ4B4g",
  m20: "lB95KLmpLR4",
  m21: "9NJj12tJzqc",
  m22: "YoHD9XEInc0",
  m23: "TnGnB1bEqtg",
  m24: "neCVOVJTQoU",
  m25: "EP34Yoxs3HQ",
  m26: "ARtJCaIOkx0",
  m27: "u3V5KDHRQvk",
  m28: "DuWEEKeJLMI",
  m29: "y-mt2YNQd_U",
  m30: "DKcfyVrmmBo",
  m31: "In8fuzj3gck",
  m32: "0voO8gQkdso",
};

export function isFreePlayable(movie: Movie | undefined): boolean {
  return Boolean(movie?.youtubePlaybackId || movie?.freePlaybackUrl);
}

export function paidStreamerBlocked(label: string): boolean {
  const s = label.toLowerCase();
  return [
    "netflix",
    "disney",
    "hulu",
    "max",
    "hbo",
    "prime",
    "amazon",
    "peacock",
    "paramount",
    "apple tv",
  ].some((k) => s.includes(k));
}
