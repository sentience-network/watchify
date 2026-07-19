/** Parse classic-TV style titles into series + season/episode for ordering. */

export type ParsedEpisode = {
  seriesTitle: string;
  seriesSlug: string;
  season: number;
  episode: number;
  episodeTitle: string;
  /** Sort key: season*10_000 + episode (unknown episode → large). */
  sortKey: number;
};

const WORD_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/**
 * Known classic shows → display title.
 * Keys are normalizeSeriesKey() results (articles/years stripped).
 */
const SERIES_CANONICAL: Record<string, string> = {
  "jack benny": "The Jack Benny Program",
  "jack benny program": "The Jack Benny Program",
  "lone ranger": "The Lone Ranger",
  "adventures of ozzie and harriet": "The Adventures of Ozzie and Harriet",
  "ozzie and harriet": "The Adventures of Ozzie and Harriet",
  "meet corliss archer": "Meet Corliss Archer",
  "corliss archer": "Meet Corliss Archer",
  medic: "Medic",
  "rocky king detective": "Rocky King Detective",
  "rocky king": "Rocky King Detective",
  "diver dan": "Diver Dan",
  "quatermass and the pit": "Quatermass and the Pit",
  "adventures of sir lancelot": "The Adventures of Sir Lancelot",
  "sir lancelot": "The Adventures of Sir Lancelot",
  "life with elizabeth": "Life with Elizabeth",
  "i married joan": "I Married Joan",
  "trouble with father": "The Trouble with Father",
  goldbergs: "The Goldbergs",
  "the goldbergs": "The Goldbergs",
  "petticoat junction": "Petticoat Junction",
  buccaneers: "The Buccaneers",
  "dennis okeefe show": "The Dennis O'Keefe Show",
  "dennis o keefe show": "The Dennis O'Keefe Show",
  "sheriff of cochise": "Sheriff of Cochise",
  "tales of tomorrow": "Tales of Tomorrow",
  "general electric theater": "General Electric Theater",
  "ge theater": "General Electric Theater",
  "schlitz playhouse": "Schlitz Playhouse",
  "schlitz playhouse of stars": "Schlitz Playhouse",
  "four star playhouse": "Four Star Playhouse",
  "whats my line": "What's My Line",
  "match game": "The Match Game",
  shindig: "Shindig",
  "youll never get rich": "You'll Never Get Rich",
  "phil silvers show": "The Phil Silvers Show",
};

/** Substring detectors on raw title/id when structured parse fails. */
const SERIES_HINTS: { re: RegExp; title: string }[] = [
  { re: /\bjack\s+benny\b/i, title: "The Jack Benny Program" },
  { re: /\blone\s+ranger\b/i, title: "The Lone Ranger" },
  { re: /\bozzie\s+and\s+harriet\b/i, title: "The Adventures of Ozzie and Harriet" },
  { re: /\bmeet\s+corliss\s+archer\b|\bcorliss\s+archer\b/i, title: "Meet Corliss Archer" },
  { re: /["']medic["']/i, title: "Medic" },
  { re: /\brocky\s+king\b/i, title: "Rocky King Detective" },
  { re: /\bdiver\s+dan\b/i, title: "Diver Dan" },
  { re: /\bquatermass\s+and\s+the\s+pit\b/i, title: "Quatermass and the Pit" },
  { re: /\bsir\s+lancelot\b/i, title: "The Adventures of Sir Lancelot" },
  { re: /\blife\s+with\s+elizabeth\b/i, title: "Life with Elizabeth" },
  { re: /\bi\s+married\s+joan\b/i, title: "I Married Joan" },
  { re: /\btrouble\s+with\s+father\b/i, title: "The Trouble with Father" },
  { re: /\bgoldbergs\b/i, title: "The Goldbergs" },
  { re: /\bbuccaneers\b/i, title: "The Buccaneers" },
  { re: /\bsheriff\s+of\s+cochise\b/i, title: "Sheriff of Cochise" },
  { re: /\btales\s+of\s+tomorrow\b/i, title: "Tales of Tomorrow" },
  { re: /\bgeneral\s+electric\s+theater\b|\bge\s+theater\b/i, title: "General Electric Theater" },
  { re: /\bschlitz\s+playhouse\b/i, title: "Schlitz Playhouse" },
  { re: /\bfour\s+star\s+playhouse\b/i, title: "Four Star Playhouse" },
  { re: /\bpetticoat\s+junction\b/i, title: "Petticoat Junction" },
  { re: /\bwhat'?s\s+my\s+line\b/i, title: "What's My Line" },
];

/** Normalize for merge: drop articles, years, filler words. */
export function normalizeSeriesKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`´]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(19|20)\d{2}s?\b/g, " ")
    .replace(
      /\b(the|a|an|tv|series|show|program|programme|hour|theatre|theater|misc|episode|ep)\b/g,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifySeries(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Map messy Archive names onto one display title + stable slug. */
export function canonicalizeSeries(name: string): { title: string; slug: string } {
  const cleaned = cleanSeriesName(name);
  const key = normalizeSeriesKey(cleaned);
  if (!key) {
    return { title: cleaned || name, slug: slugifySeries(cleaned || name) };
  }
  const title = SERIES_CANONICAL[key] || cleaned;
  // Prefer canonical slug so "Jack Benny" and "The Jack Benny Program" share a bucket
  const canonKey = normalizeSeriesKey(title);
  const display = SERIES_CANONICAL[canonKey] || title;
  return { title: display, slug: slugifySeries(display) };
}

function cleanSeriesName(name: string): string {
  return name
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
    .replace(/\b(tv|colorized|restored|remastered|uncut)\b/gi, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\(?\d{4}\)?\s*$/i, "")
    .replace(/\s+the$/i, "")
    .trim();
}

function stripLeadingDateCode(raw: string): string {
  // "56 01 01 The Jack Benny…" or "55-04-17 …"
  return raw
    .replace(/^\d{2}[\s./-]+\d{2}[\s./-]+\d{2}\s+/, "")
    .replace(/^\d{4}[\s./-]+\d{1,2}[\s./-]+\d{1,2}\s+/, "")
    .trim();
}

function episodeWordToNum(word: string): number {
  return WORD_NUM[word.toLowerCase()] || 0;
}

function extractEpisodeNum(text: string): { episode: number; rest: string } {
  let m = text.match(
    /^(?:episode|ep\.?)\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,3})\b[:\s-]*(.*)$/i
  );
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : episodeWordToNum(m[1]);
    return { episode: n, rest: (m[2] || "").trim() };
  }
  m = text.match(/^misc(?:\s+ep(?:isode)?)?\s*(?:no\.?\s*)?(\d{1,3})\b[:\s-]*(.*)$/i);
  if (m) return { episode: Number(m[1]), rest: (m[2] || "").trim() };
  return { episode: 0, rest: text };
}

/**
 * Best-effort parse of Archive.org classic TV titles.
 * Returns null when the item looks like a one-off (no series signal).
 */
export function parseSeriesEpisode(
  title: string,
  identifier = ""
): ParsedEpisode | null {
  let raw = title.replace(/\s+/g, " ").trim();
  if (!raw) return null;
  raw = stripLeadingDateCode(raw);
  const id = identifier.replace(/[_-]+/g, " ");

  // Fifties Television: ''Show'' …  (before keyword hints — avoids false matches)
  let m = raw.match(
    /^(?:\d{4}'?s|fifties|sixties)\s+television:\s*["'“”‘’]{1,2}([^"'“”‘’]+)["'“”‘’]{1,2}\s*(.*)$/i
  );
  if (m) {
    let epBit = (m[2] || "").trim();
    const epInParen = epBit.match(
      /\([^)]*episode:\s*["'“”‘’]{0,2}([^"'“”‘’)]+)/i
    );
    if (epInParen) epBit = epInParen[1].trim();
    else epBit = epBit.replace(/^[-–:]\s*/, "").trim();
    const { episode, rest } = extractEpisodeNum(epBit);
    return make(
      cleanSeriesName(m[1]),
      1,
      episode,
      rest || epBit || cleanSeriesName(m[1])
    );
  }

  // SxxExx anywhere: "Show 1949 (S01E03) Title" / "Show s01e03 Title"
  m = raw.match(
    /^(.*?)[\s(]+S(\d{1,2})\s*E(\d{1,3})\)?\s*[-–:]?\s*(.*)$/i
  );
  if (m) {
    const seriesTitle = cleanSeriesName(m[1].replace(/\s+\d{4}\s*$/, ""));
    const season = Number(m[2]);
    const episode = Number(m[3]);
    const episodeTitle = (m[4] || "").trim() || `Episode ${episode}`;
    if (seriesTitle.length >= 2) {
      return make(seriesTitle, season, episode, episodeTitle);
    }
  }

  // Jack Benny style: S 06e 06
  m = raw.match(
    /^(.*?\b(?:Program|Show|Hour|Theatre|Theater))\s+S\s*(\d{1,2})\s*e\s*(\d{1,3})\s+(.*)$/i
  );
  if (m) {
    const seriesTitle = cleanSeriesName(
      m[1].replace(/^\d{2}\s+\d{2}\s+\d{2}\s+/, "")
    );
    return make(seriesTitle, Number(m[2]), Number(m[3]), m[4].trim());
  }

  // "Series Name" - Episode Title
  m = raw.match(/^["'“”‘’]([^"'“”‘’]{2,80})["'“”‘’]\s*[-–:]\s*(.+)$/);
  if (m) {
    const { episode, rest } = extractEpisodeNum(m[2].trim());
    return make(
      cleanSeriesName(m[1]),
      episode ? 1 : 0,
      episode,
      rest || m[2].trim()
    );
  }

  // Show - Ep 26 - Title  /  Show - Episode 3
  m = raw.match(
    /^(.*?)\s[-–]\s*(?:Ep\.?|Episode)\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,3})\s*[-–:]?\s*(.*)$/i
  );
  if (m) {
    const epNum = /^\d+$/.test(m[2]) ? Number(m[2]) : episodeWordToNum(m[2]);
    return make(
      cleanSeriesName(m[1]),
      1,
      epNum,
      (m[3] || "").trim() || `Episode ${epNum}`
    );
  }

  // Series: Ep 29 Lost City
  m = raw.match(/^(.*?):\s*Ep\.?\s*(\d{1,3})\s*(.*)$/i);
  if (m) {
    return make(
      cleanSeriesName(m[1]),
      1,
      Number(m[2]),
      (m[3] || "").trim() || `Episode ${m[2]}`
    );
  }

  // Series - Episode One / Episode 3
  m = raw.match(
    /^(.*?)\s[-–]\s*Episode\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d{1,3})\b\s*(.*)$/i
  );
  if (m) {
    const epNum = /^\d+$/.test(m[2]) ? Number(m[2]) : episodeWordToNum(m[2]);
    if (epNum > 0) {
      return make(
        cleanSeriesName(m[1]),
        1,
        epNum,
        (m[3] || "").trim() || `Episode ${epNum}`
      );
    }
  }

  // Show: Episode Title (anthology-ish)
  m = raw.match(/^([A-Za-z0-9][A-Za-z0-9 '&]{2,50}):\s+(.+)$/);
  if (m && !/commercial|news|advertising/i.test(m[1])) {
    return make(cleanSeriesName(m[1]), 0, 0, m[2].trim());
  }

  // Identifier: s-01-e-03
  m = identifier.match(/^(.*?)-s-?(\d{1,2})-e-?(\d{1,3})(?:-|$)/i);
  if (m) {
    const seriesTitle = cleanSeriesName(
      m[1].replace(/-/g, " ").replace(/\b\d{4}\b/g, "").trim()
    );
    const episodeTitle =
      raw.replace(/.*S\d{1,2}E\d{1,3}\)?\s*/i, "").trim() ||
      `Episode ${Number(m[3])}`;
    if (seriesTitle.length >= 2) {
      return make(seriesTitle, Number(m[2]), Number(m[3]), episodeTitle);
    }
  }

  // Title (Anthology Name) → series = anthology
  m = raw.match(/^(.+?)\s*\(([^)]*(?:playhouse|theater|theatre|hour)[^)]*)\)\s*$/i);
  if (m) {
    return make(cleanSeriesName(m[2]), 0, 0, cleanSeriesName(m[1]));
  }

  // Keyword hints last — merge messy wrappers onto known shows
  for (const hint of SERIES_HINTS) {
    if (hint.re.test(raw) || hint.re.test(id)) {
      const parsed = parseKnownShow(raw, hint.title);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseKnownShow(raw: string, seriesTitle: string): ParsedEpisode | null {
  // S 06e 08 / S06E08
  let m = raw.match(/S\s*(\d{1,2})\s*e\s*(\d{1,3})\s+(.*)$/i);
  if (m) {
    return make(seriesTitle, Number(m[1]), Number(m[2]), m[3].trim());
  }
  m = raw.match(/S(\d{1,2})E(\d{1,3})\)?\s*[-–:]?\s*(.*)$/i);
  if (m) {
    return make(seriesTitle, Number(m[1]), Number(m[2]), (m[3] || "").trim());
  }
  m = raw.match(/Ep\.?\s*(\d{1,3})\s*[-–:]?\s*(.*)$/i);
  if (m) {
    return make(
      seriesTitle,
      1,
      Number(m[1]),
      (m[2] || "").trim() || `Episode ${m[1]}`
    );
  }
  m = raw.match(
    /Episode\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d{1,3})\b\s*(.*)$/i
  );
  if (m) {
    const epNum = /^\d+$/.test(m[1]) ? Number(m[1]) : episodeWordToNum(m[1]);
    return make(seriesTitle, 1, epNum, (m[2] || "").trim() || `Episode ${epNum}`);
  }
  m = raw.match(/\([^)]*Episode:\s*["'“”‘’]?([^"'“”‘’)]+)["'“”‘’]?/i);
  if (m) {
    return make(seriesTitle, 0, 0, m[1].trim());
  }
  // "Show" Episode Title  or  "Show" - Episode Title
  const escaped = seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  m = raw.match(
    new RegExp(
      `["'“”‘’]?${escaped}["'“”‘’]?\\s*[-–:]?\\s*(.+)$`,
      "i"
    )
  );
  let epTitle = m?.[1]?.trim() || "";
  epTitle = epTitle
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/^["'“”‘’]/, "")
    .trim();
  if (!epTitle || epTitle.length < 2) {
    epTitle = raw
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(new RegExp(`^.*?${escaped}\\s*[-–:]?\\s*`, "i"), "")
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .trim();
  }
  if (!epTitle || /^medic"?$/i.test(epTitle)) epTitle = seriesTitle;
  return make(seriesTitle, 0, 0, epTitle || seriesTitle);
}

function make(
  seriesTitle: string,
  season: number,
  episode: number,
  episodeTitle: string
): ParsedEpisode | null {
  const cleaned = cleanSeriesName(seriesTitle);
  if (cleaned.length < 2) return null;
  const { title, slug } = canonicalizeSeries(cleaned);
  const seasonN = Number.isFinite(season) ? season : 0;
  const episodeN = Number.isFinite(episode) ? episode : 0;
  const sortKey =
    (seasonN > 0 ? seasonN : 1) * 10_000 +
    (episodeN > 0 ? episodeN : 9_999);
  return {
    seriesTitle: title,
    seriesSlug: slug,
    season: seasonN,
    episode: episodeN,
    episodeTitle: episodeTitle || title,
    sortKey,
  };
}

export function compareEpisodes(
  a: { season?: number; episode?: number; sortKey?: number; title: string },
  b: { season?: number; episode?: number; sortKey?: number; title: string }
): number {
  const ak = a.sortKey ?? (a.season || 1) * 10_000 + (a.episode || 9999);
  const bk = b.sortKey ?? (b.season || 1) * 10_000 + (b.episode || 9999);
  if (ak !== bk) return ak - bk;
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}
