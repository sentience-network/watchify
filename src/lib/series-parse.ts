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

export function slugifySeries(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function cleanSeriesName(name: string): string {
  return name
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+the$|\s+\d{4}$/i, "")
    .trim();
}

function episodeWordToNum(word: string): number {
  return WORD_NUM[word.toLowerCase()] || 0;
}

/**
 * Best-effort parse of Archive.org classic TV titles.
 * Returns null when the item looks like a one-off (no series signal).
 */
export function parseSeriesEpisode(
  title: string,
  identifier = ""
): ParsedEpisode | null {
  const raw = title.replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const id = identifier.replace(/[_-]+/g, " ");

  // The Lone Ranger 1949 (S01E03) Title  OR  ... S01E03 ...
  let m = raw.match(
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
    const seriesTitle = cleanSeriesName(m[1].replace(/^\d{2}\s+\d{2}\s+\d{2}\s+/, ""));
    return make(seriesTitle, Number(m[2]), Number(m[3]), m[4].trim());
  }

  // Diver Dan: Ep 29 Lost City  /  Ep13 Title
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
    const epNum = /^\d+$/.test(m[2])
      ? Number(m[2])
      : episodeWordToNum(m[2]);
    if (epNum > 0) {
      return make(
        cleanSeriesName(m[1]),
        1,
        epNum,
        (m[3] || "").trim() || `Episode ${epNum}`
      );
    }
  }

  // "Series Name" - Episode Title
  m = raw.match(/^["']([^"']{2,80})["']\s*[-–:]\s*(.+)$/);
  if (m) {
    return make(cleanSeriesName(m[1]), 0, 0, m[2].trim());
  }

  // Series Name (S01E01 …) already handled; try identifier DiverDan Ep29
  m = id.match(/^(.*?)(?:\s+ep\.?\s*|\s+e)(\d{1,3})\b/i);
  if (m && raw.match(/\bep\.?\s*\d+/i)) {
    const seriesFromTitle = raw.split(":")[0];
    return make(
      cleanSeriesName(seriesFromTitle || m[1]),
      1,
      Number(m[2]),
      raw.replace(/^.*?:\s*/, "").replace(/^Ep\.?\s*\d+\s*/i, "").trim() ||
        `Episode ${m[2]}`
    );
  }

  // Lone Ranger style in identifier: s-01-e-03
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

  // Tales_Of_Tomorrow_-_Title → series from identifier prefix
  if (/^TOT_|Tales_Of_Tomorrow/i.test(identifier)) {
    return make("Tales of Tomorrow", 0, 0, raw);
  }
  if (/^THE_BUCCANEERS_/i.test(identifier)) {
    const ep = raw.replace(/^["']?The Buccaneers["']?\s*/i, "").trim() || raw;
    return make("The Buccaneers", 0, 0, ep);
  }
  if (/sheriffOfCochise|Sheriff of Cochise/i.test(identifier + raw)) {
    const ep = raw
      .replace(/^['"]*Sheriff of Cochise['"]*\s*[-–:]?\s*/i, "")
      .replace(/\(TV Drama.*?\)/i, "")
      .trim();
    return make("Sheriff of Cochise", 0, 0, ep || raw);
  }
  if (/Ozzie and Harriet/i.test(raw)) {
    const ep = raw
      .replace(/^['"]*The Adventures of Ozzie and Harriet['"]*\s*[-–:]?\s*/i, "")
      .replace(/\(\d{4}\)\s*$/, "")
      .trim();
    return make("The Adventures of Ozzie and Harriet", 0, 0, ep || raw);
  }
  if (/Dennis O'?Keefe Show/i.test(raw)) {
    const ep = raw
      .replace(/^["']*The Dennis O'?Keefe Show["']*\s*[-–:]?\s*/i, "")
      .trim();
    return make("The Dennis O'Keefe Show", 0, 0, ep || raw);
  }
  if (/Jack Benny Program/i.test(raw)) {
    const sm = raw.match(/S\s*(\d{1,2})\s*e\s*(\d{1,3})\s+(.*)$/i);
    if (sm) {
      return make("The Jack Benny Program", Number(sm[1]), Number(sm[2]), sm[3].trim());
    }
    return make("The Jack Benny Program", 0, 0, raw);
  }
  if (/Lone Ranger/i.test(raw)) {
    const sm = raw.match(/S(\d{1,2})E(\d{1,3})\)?\s*(.*)$/i);
    if (sm) {
      return make("The Lone Ranger", Number(sm[1]), Number(sm[2]), sm[3].trim());
    }
  }
  if (/^Diver Dan/i.test(raw)) {
    const sm = raw.match(/Ep\.?\s*(\d{1,3})\s*(.*)$/i);
    if (sm) {
      return make("Diver Dan", 1, Number(sm[1]), sm[2].trim() || `Episode ${sm[1]}`);
    }
  }

  return null;
}

function make(
  seriesTitle: string,
  season: number,
  episode: number,
  episodeTitle: string
): ParsedEpisode | null {
  const cleaned = cleanSeriesName(seriesTitle);
  if (cleaned.length < 2) return null;
  const seasonN = Number.isFinite(season) ? season : 0;
  const episodeN = Number.isFinite(episode) ? episode : 0;
  const sortKey =
    (seasonN > 0 ? seasonN : 1) * 10_000 +
    (episodeN > 0 ? episodeN : 9_999);
  return {
    seriesTitle: cleaned,
    seriesSlug: slugifySeries(cleaned),
    season: seasonN,
    episode: episodeN,
    episodeTitle: episodeTitle || cleaned,
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
