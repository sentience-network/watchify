import { buildProviderDeepLink, type ProviderDeepLink } from "./deep-links";
import type { StreamingServiceId } from "./streaming";
import type { Movie } from "./types";

type SeedProvider = { id: StreamingServiceId; titleId?: string };

type SeedRow = {
  id: string;
  title: string;
  year: number;
  overview: string;
  posterPath: string;
  backdropPath: string;
  genres: string[];
  runtime: number;
  rating: number;
  trailerYoutubeId?: string;
  tmdbId?: number;
  providers: SeedProvider[];
};

/** Reuse known-good TMDB CDN poster paths for demos (no API key required). */
const P = {
  dune: "/1pdfLvkbY9ohJlCjQH2CNhyPJrU.jpg",
  oppen: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  eeaa: "/w3L4VGOqehOEvekIZD0dgYiJk0k.jpg",
  batman: "/74xTEgt7R36Fpooo27dUoIUdoSB.jpg",
  spider: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  past: "/k3m2ate0YSXbfMsM8BPliLZlJmH.jpg",
  menu: "/fptnZJr41NWwKpdH0AaYs2xCWXu.jpg",
  topgun: "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
  parasite: "/7IiTTgloJzvGI1TAYymCfbfl3E9.jpg",
  inter: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  whip: "/7fn624DJ5EG0c747RGkQnSwjkgl.jpg",
  madmax: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
  getout: "/tFXcEIjw1bLuy4eSjs5rUkm18KO.jpg",
  lala: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  budapest: "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
  blade: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  poor: "/kCGB0oHxS21W4JkT8eC7gkycjBV.jpg",
  barbie: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
  arrival: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  social: "/n0ybepvW3W4476Yrdv9JriKoz82.jpg",
  moon: "/4911T5FbJ9eD2FmeqP7UlTNfg64.jpg",
  incep: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  hold: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  her: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  killers: "/aQPeznSu7XDTrrdCtT5eLiu52Yu.jpg",
  zone: "/hUuYbntC3yx38Sn2u1hLhYTbZWr.jpg",
  gotg: "/r2J02Z2OpNTzyfUjrp6qycePUUl.jpg",
  cocaine: "/r2J02Z2OpNTzyfUjrp6qycePUUl.jpg",
  anatomy: "/hUuYbntC3yx38Sn2u1hLhYTbZWr.jpg",
  whale: "/4911T5FbJ9eD2FmeqP7UlTNfg64.jpg",
  nope: "/AcK1FCPIwTx0MOP28e5yxl0zpTs.jpg",
  aftersun: "/9n2tJBplPbgR2ca05hSMlFFoN1k.jpg",
};

const B = {
  dune: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
  oppen: "/rLb2yw2M3eprBgJFy8UvcQRRssj.jpg",
  batman: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
  spider: "/4HodYYKEIsGOdjkGf2ZtWHPziIK.jpg",
  topgun: "/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
  inter: "/xJHokMblPvEbc5YzikThtoVleUs.jpg",
  gotg: "/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
  barbie: "/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg",
  killers: "/1XDDDPMGmxV9sEyAXbXciD23cdB.jpg",
};

function providers(...items: SeedProvider[]): SeedProvider[] {
  return items;
}

/**
 * Curated demo catalog (~100 titles). Provider deep links use official search
 * or known title URLs — never scrapes. Region availability varies.
 */
export const EXTRA_SEED: SeedRow[] = [
  { id: "m33", title: "The Prestige", year: 2006, overview: "Two stage magicians engage in a bitter rivalry.", posterPath: P.incep, backdropPath: B.inter, genres: ["Drama", "Mystery"], runtime: 130, rating: 8.5, trailerYoutubeId: "o4gHCmTQDVI", tmdbId: 1124, providers: providers({ id: "max" }, { id: "prime" }) },
  { id: "m34", title: "The Dark Knight", year: 2008, overview: "Batman faces the Joker as Gotham descends into chaos.", posterPath: P.batman, backdropPath: B.batman, genres: ["Action", "Crime"], runtime: 152, rating: 9.0, trailerYoutubeId: "EXeTwQWrcwY", tmdbId: 155, providers: providers({ id: "max", titleId: "movie/the-dark-knight" }, { id: "netflix" }) },
  { id: "m35", title: "Joker", year: 2019, overview: "A mentally troubled comedian embarks on a downward spiral.", posterPath: P.zone, backdropPath: B.oppen, genres: ["Crime", "Drama"], runtime: 122, rating: 8.4, trailerYoutubeId: "zAGVQLHvwOY", tmdbId: 475557, providers: providers({ id: "max" }, { id: "hulu" }) },
  { id: "m36", title: "The Matrix", year: 1999, overview: "A hacker learns reality is a simulation controlled by machines.", posterPath: P.blade, backdropPath: B.inter, genres: ["Sci-Fi", "Action"], runtime: 136, rating: 8.7, trailerYoutubeId: "vKQi3bBA1y8", tmdbId: 603, providers: providers({ id: "max" }, { id: "hulu" }) },
  { id: "m37", title: "Fight Club", year: 1999, overview: "An insomniac and a soap maker form an underground fight club.", posterPath: P.social, backdropPath: B.oppen, genres: ["Drama"], runtime: 139, rating: 8.8, trailerYoutubeId: "qtRKdVHc-cE", tmdbId: 550, providers: providers({ id: "hulu" }, { id: "disney" }) },
  { id: "m38", title: "Pulp Fiction", year: 1994, overview: "The lives of two hitmen intertwine with a boxer and a gangster's wife.", posterPath: P.budapest, backdropPath: B.barbie, genres: ["Crime", "Comedy"], runtime: 154, rating: 8.9, trailerYoutubeId: "s7EdQ4FqbhY", tmdbId: 680, providers: providers({ id: "paramount" }, { id: "prime" }) },
  { id: "m39", title: "Goodfellas", year: 1990, overview: "The story of Henry Hill and his life in the mob.", posterPath: P.killers, backdropPath: B.killers, genres: ["Crime", "Drama"], runtime: 145, rating: 8.7, trailerYoutubeId: "qo5jJpHtI1Y", tmdbId: 769, providers: providers({ id: "max" }, { id: "paramount" }) },
  { id: "m40", title: "The Godfather", year: 1972, overview: "The aging patriarch of a crime dynasty transfers control to his son.", posterPath: P.social, backdropPath: B.oppen, genres: ["Crime", "Drama"], runtime: 175, rating: 9.2, trailerYoutubeId: "sY1S34973zA", tmdbId: 238, providers: providers({ id: "paramount" }, { id: "prime" }) },
  { id: "m41", title: "Spirited Away", year: 2001, overview: "A girl enters a world of spirits and must free her parents.", posterPath: P.eeaa, backdropPath: B.dune, genres: ["Animation", "Fantasy"], runtime: 125, rating: 8.6, trailerYoutubeId: "ByXuk9QqQkk", tmdbId: 129, providers: providers({ id: "max" }, { id: "hulu" }) },
  { id: "m42", title: "Princess Mononoke", year: 1997, overview: "A prince becomes involved in a struggle between forest gods and humans.", posterPath: P.madmax, backdropPath: B.gotg, genres: ["Animation", "Fantasy"], runtime: 134, rating: 8.4, trailerYoutubeId: "4OiMOHRD8XA", tmdbId: 128, providers: providers({ id: "max" }, { id: "netflix" }) },
  { id: "m43", title: "Your Name", year: 2016, overview: "Two strangers discover they are swapping bodies across time.", posterPath: P.past, backdropPath: B.barbie, genres: ["Animation", "Romance"], runtime: 106, rating: 8.4, trailerYoutubeId: "xU47nhruN8g", tmdbId: 372058, providers: providers({ id: "hulu" }, { id: "prime" }) },
  { id: "m44", title: "Coco", year: 2017, overview: "A boy journeys to the Land of the Dead to unlock his family's history.", posterPath: P.barbie, backdropPath: B.barbie, genres: ["Animation", "Family"], runtime: 105, rating: 8.4, trailerYoutubeId: "Rvr68u6k5sI", tmdbId: 354912, providers: providers({ id: "disney", titleId: "movies/coco/1G9PVP9z0Jg" }) },
  { id: "m45", title: "Inside Out", year: 2015, overview: "Emotions guide a girl through a move to a new city.", posterPath: P.hold, backdropPath: B.oppen, genres: ["Animation", "Family"], runtime: 95, rating: 8.1, trailerYoutubeId: "yRUAzGQ3nSY", tmdbId: 150540, providers: providers({ id: "disney" }) },
  { id: "m46", title: "Up", year: 2009, overview: "An elderly man flies his house to South America with a young scout.", posterPath: P.gotg, backdropPath: B.gotg, genres: ["Animation", "Adventure"], runtime: 96, rating: 8.0, trailerYoutubeId: "ORFWdXl_zJ4", tmdbId: 14160, providers: providers({ id: "disney" }) },
  { id: "m47", title: "WALL·E", year: 2008, overview: "A lonely robot on a deserted Earth finds love and purpose.", posterPath: P.arrival, backdropPath: B.inter, genres: ["Animation", "Sci-Fi"], runtime: 98, rating: 8.4, trailerYoutubeId: "alIq_wG9FNk", tmdbId: 10681, providers: providers({ id: "disney" }) },
  { id: "m48", title: "Avatar", year: 2009, overview: "A marine on an alien moon becomes torn between two worlds.", posterPath: P.dune, backdropPath: B.dune, genres: ["Sci-Fi", "Adventure"], runtime: 162, rating: 7.6, trailerYoutubeId: "5PSNL1qE6VY", tmdbId: 19995, providers: providers({ id: "disney" }, { id: "max" }) },
  { id: "m49", title: "Avatar: The Way of Water", year: 2022, overview: "Jake Sully and Neytiri protect their family on Pandora.", posterPath: P.dune, backdropPath: B.dune, genres: ["Sci-Fi", "Adventure"], runtime: 192, rating: 7.6, trailerYoutubeId: "d9MyW72ELq0", tmdbId: 76600, providers: providers({ id: "disney" }) },
  { id: "m50", title: "Black Panther", year: 2018, overview: "T'Challa returns home to Wakanda to take his place as king.", posterPath: P.batman, backdropPath: B.batman, genres: ["Action", "Sci-Fi"], runtime: 134, rating: 7.3, trailerYoutubeId: "xjDjIWPvbJU", tmdbId: 284054, providers: providers({ id: "disney" }) },
  { id: "m51", title: "Iron Man", year: 2008, overview: "A billionaire engineer builds a powered suit of armor.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Action", "Sci-Fi"], runtime: 126, rating: 7.9, trailerYoutubeId: "8ugaeA-nMTc", tmdbId: 1726, providers: providers({ id: "disney" }) },
  { id: "m52", title: "Thor: Ragnarok", year: 2017, overview: "Thor must escape a gladiator planet to save Asgard.", posterPath: P.gotg, backdropPath: B.gotg, genres: ["Action", "Comedy"], runtime: 130, rating: 7.9, trailerYoutubeId: "ue80QwXMRHg", tmdbId: 284053, providers: providers({ id: "disney" }) },
  { id: "m53", title: "The Mandalorian", year: 2019, overview: "A lone bounty hunter in the outer reaches of the galaxy.", posterPath: P.madmax, backdropPath: B.gotg, genres: ["Sci-Fi", "Adventure"], runtime: 40, rating: 8.5, trailerYoutubeId: "aOC8E8z_ifw", tmdbId: 82856, providers: providers({ id: "disney" }) },
  { id: "m54", title: "Andor", year: 2022, overview: "Cassian Andor's path to rebellion in the Star Wars universe.", posterPath: P.blade, backdropPath: B.inter, genres: ["Sci-Fi", "Drama"], runtime: 45, rating: 8.4, trailerYoutubeId: "cKOegEuCcfw", tmdbId: 83867, providers: providers({ id: "disney" }) },
  { id: "m55", title: "The Bear", year: 2022, overview: "A young chef returns to run his family's sandwich shop.", posterPath: P.menu, backdropPath: B.oppen, genres: ["Comedy", "Drama"], runtime: 30, rating: 8.6, trailerYoutubeId: "yJXXEyLlSJS", tmdbId: 136315, providers: providers({ id: "hulu" }) },
  { id: "m56", title: "Only Murders in the Building", year: 2021, overview: "Three strangers podcast about a murder in their building.", posterPath: P.budapest, backdropPath: B.barbie, genres: ["Comedy", "Mystery"], runtime: 30, rating: 8.1, trailerYoutubeId: "bByV84vE8nY", tmdbId: 107838, providers: providers({ id: "hulu" }) },
  { id: "m57", title: "The Handmaid's Tale", year: 2017, overview: "In a theocratic dystopia, fertile women serve as handmaids.", posterPath: P.zone, backdropPath: B.killers, genres: ["Drama", "Sci-Fi"], runtime: 50, rating: 8.4, trailerYoutubeId: "dGc5c3aGw1U", tmdbId: 69478, providers: providers({ id: "hulu" }) },
  { id: "m58", title: "Abbott Elementary", year: 2021, overview: "Teachers at an underfunded Philadelphia school try to make a difference.", posterPath: P.hold, backdropPath: B.oppen, genres: ["Comedy"], runtime: 22, rating: 8.2, trailerYoutubeId: "X8t-tG5JEsI", tmdbId: 126308, providers: providers({ id: "hulu" }) },
  { id: "m59", title: "Succession", year: 2018, overview: "The Roy family fights for control of a global media empire.", posterPath: P.social, backdropPath: B.oppen, genres: ["Drama", "Comedy"], runtime: 60, rating: 8.8, trailerYoutubeId: "tCXGJQYZ9JA", tmdbId: 76331, providers: providers({ id: "max" }) },
  { id: "m60", title: "The Last of Us", year: 2023, overview: "A smuggler escorts a girl across a post-apocalyptic U.S.", posterPath: P.madmax, backdropPath: B.gotg, genres: ["Drama", "Sci-Fi"], runtime: 60, rating: 8.7, trailerYoutubeId: "uLtkt8BonwM", tmdbId: 100088, providers: providers({ id: "max" }) },
  { id: "m61", title: "House of the Dragon", year: 2022, overview: "The Targaryen civil war that preceded Game of Thrones.", posterPath: P.dune, backdropPath: B.dune, genres: ["Fantasy", "Drama"], runtime: 60, rating: 8.4, trailerYoutubeId: "DotnJ7tTA34", tmdbId: 94997, providers: providers({ id: "max" }) },
  { id: "m62", title: "Euphoria", year: 2019, overview: "A group of high school students navigate love, identity, and trauma.", posterPath: P.poor, backdropPath: B.barbie, genres: ["Drama"], runtime: 55, rating: 8.3, trailerYoutubeId: "j7jPJvJiY_M", tmdbId: 85552, providers: providers({ id: "max" }) },
  { id: "m63", title: "The White Lotus", year: 2021, overview: "Guests and staff collide at luxury resorts around the world.", posterPath: P.past, backdropPath: B.barbie, genres: ["Comedy", "Drama"], runtime: 60, rating: 8.0, trailerYoutubeId: "TGLq7v4m5YI", tmdbId: 124364, providers: providers({ id: "max" }) },
  { id: "m64", title: "Chernobyl", year: 2019, overview: "The true story of the 1986 nuclear disaster.", posterPath: P.zone, backdropPath: B.killers, genres: ["Drama", "History"], runtime: 65, rating: 9.3, trailerYoutubeId: "s9APLXM9Ei8", tmdbId: 87108, providers: providers({ id: "max" }, { id: "peacock" }) },
  { id: "m65", title: "The Boys", year: 2019, overview: "Vigilantes take on corrupt superheroes.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Action", "Comedy"], runtime: 60, rating: 8.7, trailerYoutubeId: "tcrNsIa1vsI", tmdbId: 76479, providers: providers({ id: "prime" }) },
  { id: "m66", title: "The Marvelous Mrs. Maisel", year: 2017, overview: "A 1950s housewife discovers a gift for stand-up comedy.", posterPath: P.lala, backdropPath: B.barbie, genres: ["Comedy", "Drama"], runtime: 50, rating: 8.7, trailerYoutubeId: "6LOjYiFiZEg", tmdbId: 70710, providers: providers({ id: "prime" }) },
  { id: "m67", title: "Reacher", year: 2022, overview: "Jack Reacher investigates a murder in a small town.", posterPath: P.batman, backdropPath: B.batman, genres: ["Action", "Crime"], runtime: 50, rating: 8.0, trailerYoutubeId: "GzvGjJjqXW8", tmdbId: 108978, providers: providers({ id: "prime" }) },
  { id: "m68", title: "The Rings of Power", year: 2022, overview: "Epic tales set in Middle-earth's Second Age.", posterPath: P.dune, backdropPath: B.dune, genres: ["Fantasy", "Adventure"], runtime: 65, rating: 6.9, trailerYoutubeId: "x8UAx5wbjLA", tmdbId: 84773, providers: providers({ id: "prime" }) },
  { id: "m69", title: "Fallout", year: 2024, overview: "Vault dwellers emerge into a post-nuclear wasteland.", posterPath: P.madmax, backdropPath: B.gotg, genres: ["Sci-Fi", "Adventure"], runtime: 60, rating: 8.4, trailerYoutubeId: "V-mugKDQLng", tmdbId: 106379, providers: providers({ id: "prime" }) },
  { id: "m70", title: "Ted Lasso", year: 2020, overview: "An American football coach manages an English soccer team.", posterPath: P.hold, backdropPath: B.oppen, genres: ["Comedy", "Drama"], runtime: 30, rating: 8.8, trailerYoutubeId: "3Y7rx4j-zdY", tmdbId: 97546, providers: providers({ id: "apple" }) },
  { id: "m71", title: "Severance", year: 2022, overview: "Office workers' memories are surgically divided between work and life.", posterPath: P.arrival, backdropPath: B.inter, genres: ["Sci-Fi", "Thriller"], runtime: 50, rating: 8.7, trailerYoutubeId: "xEQPKhb0r7Q", tmdbId: 95396, providers: providers({ id: "apple" }) },
  { id: "m72", title: "The Morning Show", year: 2019, overview: "Behind the scenes of a network morning news program.", posterPath: P.social, backdropPath: B.oppen, genres: ["Drama"], runtime: 60, rating: 7.8, trailerYoutubeId: "YdgUlKPpjnA", tmdbId: 83095, providers: providers({ id: "apple" }) },
  { id: "m73", title: "Foundation", year: 2021, overview: "A mathematician predicts the fall of a galactic empire.", posterPath: P.dune, backdropPath: B.dune, genres: ["Sci-Fi", "Drama"], runtime: 60, rating: 7.3, trailerYoutubeId: "X4QYVJ-CWj8", tmdbId: 93740, providers: providers({ id: "apple" }) },
  { id: "m74", title: "Slow Horses", year: 2022, overview: "Misfit MI5 agents take on cases nobody else wants.", posterPath: P.whip, backdropPath: B.oppen, genres: ["Thriller", "Drama"], runtime: 45, rating: 8.3, trailerYoutubeId: "iJjtjB5HhY8", tmdbId: 95480, providers: providers({ id: "apple" }) },
  { id: "m75", title: "The Office", year: 2005, overview: "A mockumentary on a group of office workers.", posterPath: P.budapest, backdropPath: B.barbie, genres: ["Comedy"], runtime: 22, rating: 8.9, trailerYoutubeId: "LHOtME2DL4g", tmdbId: 2316, providers: providers({ id: "peacock" }, { id: "netflix" }) },
  { id: "m76", title: "Parks and Recreation", year: 2009, overview: "Leslie Knope navigates local government in Pawnee.", posterPath: P.hold, backdropPath: B.oppen, genres: ["Comedy"], runtime: 22, rating: 8.6, trailerYoutubeId: "TvdQMxu7Yj8", tmdbId: 8592, providers: providers({ id: "peacock" }, { id: "netflix" }) },
  { id: "m77", title: "Yellowstone", year: 2018, overview: "The Dutton family fights to protect their Montana ranch.", posterPath: P.killers, backdropPath: B.killers, genres: ["Drama", "Western"], runtime: 60, rating: 8.6, trailerYoutubeId: "p33RmqFJa7I", tmdbId: 73586, providers: providers({ id: "peacock" }, { id: "paramount" }) },
  { id: "m78", title: "Bel-Air", year: 2022, overview: "A dramatic reimagining of The Fresh Prince of Bel-Air.", posterPath: P.moon, backdropPath: B.oppen, genres: ["Drama"], runtime: 45, rating: 7.5, trailerYoutubeId: "1R5vLAqzV5I", tmdbId: 120998, providers: providers({ id: "peacock" }) },
  { id: "m79", title: "Twisted Metal", year: 2023, overview: "A milkman turned getaway driver in a post-apocalyptic wasteland.", posterPath: P.madmax, backdropPath: B.gotg, genres: ["Action", "Comedy"], runtime: 30, rating: 7.4, trailerYoutubeId: "tL8Y7y8QY3E", tmdbId: 114472, providers: providers({ id: "peacock" }) },
  { id: "m80", title: "South Park", year: 1997, overview: "Four boys navigate absurd adventures in a Colorado town.", posterPath: P.menu, backdropPath: B.oppen, genres: ["Animation", "Comedy"], runtime: 22, rating: 8.7, trailerYoutubeId: "QJrXKdSWqbk", tmdbId: 1434, providers: providers({ id: "paramount" }) },
  { id: "m81", title: "Star Trek: Strange New Worlds", year: 2022, overview: "Captain Pike and the Enterprise explore new worlds.", posterPath: P.arrival, backdropPath: B.inter, genres: ["Sci-Fi", "Adventure"], runtime: 50, rating: 8.3, trailerYoutubeId: "jdOl59N89Gw", tmdbId: 103516, providers: providers({ id: "paramount" }) },
  { id: "m82", title: "Criminal Minds", year: 2005, overview: "The FBI Behavioral Analysis Unit profiles serial killers.", posterPath: P.getout, backdropPath: B.batman, genres: ["Crime", "Drama"], runtime: 42, rating: 8.1, trailerYoutubeId: "J_hJbQ7m7mE", tmdbId: 4057, providers: providers({ id: "paramount" }, { id: "hulu" }) },
  { id: "m83", title: "Halo", year: 2022, overview: "Master Chief battles the Covenant to save humanity.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Sci-Fi", "Action"], runtime: 50, rating: 7.1, trailerYoutubeId: "5KZ3M8tOOmY", tmdbId: 92615, providers: providers({ id: "paramount" }) },
  { id: "m84", title: "Stranger Things", year: 2016, overview: "Kids in Hawkins confront supernatural forces from the Upside Down.", posterPath: P.nope, backdropPath: B.batman, genres: ["Sci-Fi", "Horror"], runtime: 50, rating: 8.7, trailerYoutubeId: "b9EkMc79ZSU", tmdbId: 66732, providers: providers({ id: "netflix", titleId: "80057281" }) },
  { id: "m85", title: "The Crown", year: 2016, overview: "The reign of Queen Elizabeth II across decades.", posterPath: P.zone, backdropPath: B.killers, genres: ["Drama", "History"], runtime: 60, rating: 8.6, trailerYoutubeId: "JWtnJjn6ng0", tmdbId: 65494, providers: providers({ id: "netflix" }) },
  { id: "m86", title: "Wednesday", year: 2022, overview: "Wednesday Addams investigates murders at Nevermore Academy.", posterPath: P.anatomy, backdropPath: B.killers, genres: ["Comedy", "Mystery"], runtime: 50, rating: 8.1, trailerYoutubeId: "Di310WS8zLk", tmdbId: 119051, providers: providers({ id: "netflix", titleId: "81231974" }) },
  { id: "m87", title: "Bridgerton", year: 2020, overview: "Romance and intrigue among London's high society.", posterPath: P.lala, backdropPath: B.barbie, genres: ["Drama", "Romance"], runtime: 60, rating: 7.3, trailerYoutubeId: "qNzYs4i2w3U", tmdbId: 94722, providers: providers({ id: "netflix" }) },
  { id: "m88", title: "Squid Game", year: 2021, overview: "Contestants risk everything in deadly children's games.", posterPath: P.parasite, backdropPath: B.dune, genres: ["Thriller", "Drama"], runtime: 55, rating: 8.0, trailerYoutubeId: "oqxAJKy0ii4", tmdbId: 93405, providers: providers({ id: "netflix", titleId: "81040344" }) },
  { id: "m89", title: "Dark", year: 2017, overview: "A missing child reveals time-travel secrets in a German town.", posterPath: P.arrival, backdropPath: B.inter, genres: ["Sci-Fi", "Mystery"], runtime: 60, rating: 8.7, trailerYoutubeId: "rrwycJ08Pla", tmdbId: 70523, providers: providers({ id: "netflix" }) },
  { id: "m90", title: "Glass Onion", year: 2022, overview: "Detective Benoit Blanc investigates a murder among tech elites.", posterPath: P.budapest, backdropPath: B.barbie, genres: ["Comedy", "Mystery"], runtime: 139, rating: 7.1, trailerYoutubeId: "gjxSNAkglW0", tmdbId: 661374, providers: providers({ id: "netflix", titleId: "81448635" }) },
  { id: "m91", title: "The Irishman", year: 2019, overview: "A hitman recounts his life in the mob and Jimmy Hoffa.", posterPath: P.killers, backdropPath: B.killers, genres: ["Crime", "Drama"], runtime: 209, rating: 7.8, trailerYoutubeId: "WHXxVmeGQUc", tmdbId: 398978, providers: providers({ id: "netflix" }) },
  { id: "m92", title: "Roma", year: 2018, overview: "A year in the life of a domestic worker in 1970s Mexico City.", posterPath: P.moon, backdropPath: B.oppen, genres: ["Drama"], runtime: 135, rating: 7.7, trailerYoutubeId: "6CTkjY4q_bY", tmdbId: 426426, providers: providers({ id: "netflix" }) },
  { id: "m93", title: "Extraction", year: 2020, overview: "A black-market mercenary attempts a high-stakes extraction in Dhaka.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Action", "Thriller"], runtime: 116, rating: 6.8, trailerYoutubeId: "L6P3nI6VnlY", tmdbId: 545609, providers: providers({ id: "netflix" }) },
  { id: "m94", title: "Don't Look Up", year: 2021, overview: "Astronomers warn of a comet that will destroy Earth.", posterPath: P.hold, backdropPath: B.oppen, genres: ["Comedy", "Sci-Fi"], runtime: 138, rating: 7.2, trailerYoutubeId: "RbIxYm3mKzI", tmdbId: 646380, providers: providers({ id: "netflix" }) },
  { id: "m95", title: "The Menu", year: 2022, overview: "Diners at an exclusive restaurant face a chef's deadly menu.", posterPath: P.menu, backdropPath: B.oppen, genres: ["Horror", "Thriller"], runtime: 107, rating: 7.2, trailerYoutubeId: "C_uTkUGcNiQ", tmdbId: 830784, providers: providers({ id: "hulu" }, { id: "disney" }) },
  { id: "m96", title: "Everything Everywhere All at Once", year: 2022, overview: "An immigrant laundromat owner must save the multiverse.", posterPath: P.eeaa, backdropPath: B.dune, genres: ["Action", "Comedy"], runtime: 139, rating: 8.0, trailerYoutubeId: "wxN1T1uwQks", tmdbId: 545611, providers: providers({ id: "prime" }, { id: "paramount" }) },
  { id: "m97", title: "Dune", year: 2021, overview: "Paul Atreides joins the Fremen on the desert planet Arrakis.", posterPath: P.dune, backdropPath: B.dune, genres: ["Sci-Fi", "Adventure"], runtime: 155, rating: 8.0, trailerYoutubeId: "n9xhJrPXop4", tmdbId: 438631, providers: providers({ id: "max" }, { id: "prime" }) },
  { id: "m98", title: "John Wick", year: 2014, overview: "An ex-hitman comes out of retirement for revenge.", posterPath: P.batman, backdropPath: B.batman, genres: ["Action", "Thriller"], runtime: 101, rating: 7.4, trailerYoutubeId: "C0BMx-qxsP4", tmdbId: 245891, providers: providers({ id: "paramount" }, { id: "prime" }) },
  { id: "m99", title: "Mission: Impossible – Fallout", year: 2018, overview: "Ethan Hunt races to recover stolen plutonium.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Action", "Adventure"], runtime: 147, rating: 7.7, trailerYoutubeId: "wb49-oV0F78", tmdbId: 353081, providers: providers({ id: "paramount" }, { id: "prime" }) },
  { id: "m100", title: "Top Gun", year: 1986, overview: "A hotshot naval aviator trains at the elite Top Gun school.", posterPath: P.topgun, backdropPath: B.topgun, genres: ["Action", "Drama"], runtime: 110, rating: 7.0, trailerYoutubeId: "qAfbp3YX9F0", tmdbId: 744, providers: providers({ id: "paramount" }) },
  { id: "m101", title: "Encanto", year: 2021, overview: "A Colombian family with magical gifts faces a fading miracle.", posterPath: P.barbie, backdropPath: B.barbie, genres: ["Animation", "Family"], runtime: 102, rating: 7.6, trailerYoutubeId: "CaimKeDcudo", tmdbId: 568124, providers: providers({ id: "disney" }) },
  { id: "m102", title: "Moana", year: 2016, overview: "A Polynesian teenager sails to save her people with demigod Maui.", posterPath: P.gotg, backdropPath: B.gotg, genres: ["Animation", "Adventure"], runtime: 107, rating: 7.6, trailerYoutubeId: "LKFuXETZUsI", tmdbId: 277834, providers: providers({ id: "disney" }) },
  { id: "m103", title: "Frozen", year: 2013, overview: "A fearless princess sets off to find her estranged sister.", posterPath: P.past, backdropPath: B.barbie, genres: ["Animation", "Family"], runtime: 102, rating: 7.4, trailerYoutubeId: "TbQm5doF_Uc", tmdbId: 109445, providers: providers({ id: "disney" }) },
  { id: "m104", title: "Soul", year: 2020, overview: "A jazz musician's soul seeks meaning before returning to Earth.", posterPath: P.moon, backdropPath: B.oppen, genres: ["Animation", "Comedy"], runtime: 100, rating: 8.0, trailerYoutubeId: "xOsLIiBStEs", tmdbId: 508442, providers: providers({ id: "disney" }) },
  { id: "m105", title: "Turning Red", year: 2022, overview: "A teen turns into a giant red panda when she gets too excited.", posterPath: P.poor, backdropPath: B.barbie, genres: ["Animation", "Comedy"], runtime: 100, rating: 7.0, trailerYoutubeId: "XdKzUbAiswE", tmdbId: 508947, providers: providers({ id: "disney" }) },
  { id: "m106", title: "Shōgun", year: 2024, overview: "An English sailor becomes embroiled in feudal Japan politics.", posterPath: P.whip, backdropPath: B.killers, genres: ["Drama", "History"], runtime: 60, rating: 8.7, trailerYoutubeId: "ySTuho_m3jA", tmdbId: 120911, providers: providers({ id: "hulu" }, { id: "disney" }) },
  { id: "m107", title: "Alien", year: 1979, overview: "The crew of a commercial spacecraft encounters a deadly alien.", posterPath: P.blade, backdropPath: B.inter, genres: ["Horror", "Sci-Fi"], runtime: 117, rating: 8.4, trailerYoutubeId: "jQ5lPt9edzQ", tmdbId: 348, providers: providers({ id: "hulu" }, { id: "disney" }) },
  { id: "m108", title: "Alien: Romulus", year: 2024, overview: "Young space colonizers face the universe's most terrifying life form.", posterPath: P.nope, backdropPath: B.batman, genres: ["Horror", "Sci-Fi"], runtime: 119, rating: 7.2, trailerYoutubeId: "x0XDEhP4MFE", tmdbId: 945961, providers: providers({ id: "hulu" }, { id: "max" }) },
  { id: "m109", title: "Deadpool & Wolverine", year: 2024, overview: "Wade Wilson teams up with Wolverine in the MCU.", posterPath: P.spider, backdropPath: B.spider, genres: ["Action", "Comedy"], runtime: 128, rating: 7.7, trailerYoutubeId: "73_1haHU8wk", tmdbId: 533535, providers: providers({ id: "disney" }) },
  { id: "m110", title: "Wicked", year: 2024, overview: "The untold story of the witches of Oz before Dorothy arrived.", posterPath: P.lala, backdropPath: B.barbie, genres: ["Fantasy", "Musical"], runtime: 160, rating: 7.6, trailerYoutubeId: "6COmYeDtv_4", tmdbId: 402431, providers: providers({ id: "peacock" }, { id: "prime" }) },
];

export function seedToMovie(row: SeedRow): Movie {
  const providerLinks: ProviderDeepLink[] = row.providers.map((p) =>
    buildProviderDeepLink(p.id, row.title, p.titleId)
  );
  return {
    id: row.id,
    title: row.title.trim(),
    year: row.year,
    overview: row.overview,
    posterPath: row.posterPath,
    backdropPath: row.backdropPath,
    genres: row.genres,
    runtime: row.runtime,
    rating: row.rating,
    trailerYoutubeId: row.trailerYoutubeId,
    tmdbId: row.tmdbId,
    licenseKind: "catalog",
    providers: providerLinks,
  };
}

export const EXTRA_CATALOG: Movie[] = EXTRA_SEED.map(seedToMovie);
