/** Fixed profile look templates — no user HTML. */

import {
  ACCENT_PALETTES,
  AVATAR_FRAMES,
  AVATAR_STYLES,
  BANNER_STYLES,
  NAMEPLATE_STYLES,
  PATTERN_OVERLAYS,
  PROFILE_BADGES,
  dicebearUrlForStyle,
  multiplyCombinations,
  normalizeAccentPalette,
  normalizeAvatarFrame,
  normalizeAvatarStyle,
  normalizeBannerStyle,
  normalizeNameplateStyle,
  normalizePatternOverlay,
  paletteHex,
  parseProfileBadgeIds,
  type AccentPaletteId,
  type AvatarFrameId,
  type AvatarStyleId,
  type BannerStyleId,
  type NameplateStyleId,
  type PatternOverlayId,
  type ProfileBadgeId,
} from "./profile-cosmetics";

export type ProfileThemeId = string;
export type BorderStyleId = string;

export type ProfileLooks = {
  profileTheme: ProfileThemeId;
  borderStyle: BorderStyleId;
  accentColor: string;
  accentPalette: AccentPaletteId;
  avatarUrl: string | null;
  avatarHue: number;
  avatarStyle: AvatarStyleId;
  avatarFrame: AvatarFrameId;
  bannerStyle: BannerStyleId;
  patternOverlay: PatternOverlayId;
  nameplateStyle: NameplateStyleId;
  profileBadgeIds: ProfileBadgeId[];
  favoriteMovieIds: string[];
};

export const PROFILE_THEMES: {
  id: string;
  label: string;
  blurb: string;
  defaultAccent: string;
  tier: "free" | "party";
  category: string;
}[] = [
  {
    id: "classic",
    label: "Classic stage",
    blurb: "Watchify teal — clean and familiar",
    defaultAccent: "#2dd4bf",
    tier: "free",
    category: "Brand",
  },
  {
    id: "neon",
    label: "Neon night",
    blurb: "Electric cyan glow for party hosts",
    defaultAccent: "#22d3ee",
    tier: "free",
    category: "Glow",
  },
  {
    id: "cinema",
    label: "Cinema gold",
    blurb: "Warm amber theater lights",
    defaultAccent: "#f0b429",
    tier: "free",
    category: "Cinema",
  },
  {
    id: "coral",
    label: "Sunset coral",
    blurb: "Soft peach energy without purple clutter",
    defaultAccent: "#fb7185",
    tier: "free",
    category: "Warm",
  },
  {
    id: "midnight",
    label: "Midnight blue",
    blurb: "Cool steel for a quieter vibe",
    defaultAccent: "#60a5fa",
    tier: "free",
    category: "Cool",
  },
  {
    id: "forest",
    label: "Forest lounge",
    blurb: "Deep green seating row",
    defaultAccent: "#34d399",
    tier: "free",
    category: "Cool",
  },
  {
    id: "ember",
    label: "Ember pit",
    blurb: "Warm orange afterglow",
    defaultAccent: "#fb923c",
    tier: "free",
    category: "Warm",
  },
  {
    id: "slate",
    label: "Slate booth",
    blurb: "Quiet charcoal stage",
    defaultAccent: "#94a3b8",
    tier: "free",
    category: "Mood",
  },
  {
    id: "seafoam",
    label: "Seafoam",
    blurb: "Light teal coastal chill",
    defaultAccent: "#5eead4",
    tier: "free",
    category: "Cool",
  },
  {
    id: "noir",
    label: "Noir alley",
    blurb: "High-contrast late show",
    defaultAccent: "#e2e8f0",
    tier: "free",
    category: "Cinema",
  },
  {
    id: "matinee",
    label: "Matinee",
    blurb: "Soft afternoon light",
    defaultAccent: "#fde68a",
    tier: "free",
    category: "Cinema",
  },
  {
    id: "rainy",
    label: "Rainy night",
    blurb: "Cool mist on the glass",
    defaultAccent: "#7dd3fc",
    tier: "free",
    category: "Mood",
  },
  {
    id: "lobby",
    label: "Lobby brass",
    blurb: "Warm lobby fixture glow",
    defaultAccent: "#e7c27d",
    tier: "free",
    category: "Cinema",
  },
  {
    id: "arcade",
    label: "Arcade teal",
    blurb: "Retro cabinet energy",
    defaultAccent: "#2dd4bf",
    tier: "free",
    category: "Glow",
  },
  {
    id: "documentary",
    label: "Doc room",
    blurb: "Calm steel for serious picks",
    defaultAccent: "#93c5fd",
    tier: "free",
    category: "Mood",
  },
  {
    id: "romcom",
    label: "Rom-com blush",
    blurb: "Soft rose without the AI purple",
    defaultAccent: "#fda4af",
    tier: "free",
    category: "Warm",
  },
  {
    id: "action",
    label: "Action cut",
    blurb: "Sharp amber edge",
    defaultAccent: "#f59e0b",
    tier: "free",
    category: "Warm",
  },
  {
    id: "scifi",
    label: "Sci-fi bay",
    blurb: "Cool cyan instrument panel",
    defaultAccent: "#22d3ee",
    tier: "free",
    category: "Glow",
  },
  {
    id: "premiere",
    label: "Premiere red carpet",
    blurb: "Party-host spotlight wash",
    defaultAccent: "#f0b429",
    tier: "party",
    category: "Party",
  },
  {
    id: "afterparty",
    label: "Afterparty",
    blurb: "Late-night host lounge",
    defaultAccent: "#5eead4",
    tier: "party",
    category: "Party",
  },
  {
    id: "vip-lounge",
    label: "VIP lounge",
    blurb: "Champagne stage for Party plan",
    defaultAccent: "#f5e6c8",
    tier: "party",
    category: "Party",
  },
  {
    id: "laser-tag",
    label: "Laser tag",
    blurb: "High-energy host room",
    defaultAccent: "#f472b6",
    tier: "party",
    category: "Party",
  },
];

export const BORDER_STYLES: {
  id: string;
  label: string;
  tier: "free" | "party";
  category: string;
}[] = [
  { id: "soft", label: "Soft round", tier: "free", category: "Basic" },
  { id: "sharp", label: "Sharp", tier: "free", category: "Basic" },
  { id: "double", label: "Double frame", tier: "free", category: "Basic" },
  { id: "glow", label: "Glow frame", tier: "free", category: "Basic" },
  { id: "thin", label: "Thin line", tier: "free", category: "Basic" },
  { id: "thick", label: "Thick line", tier: "free", category: "Basic" },
  { id: "inset", label: "Inset shadow", tier: "free", category: "Depth" },
  { id: "raised", label: "Raised panel", tier: "free", category: "Depth" },
  { id: "ticket", label: "Ticket corners", tier: "free", category: "Cinema" },
  { id: "film", label: "Film sprocket", tier: "free", category: "Cinema" },
  { id: "marquee", label: "Marquee", tier: "free", category: "Cinema" },
  { id: "poster", label: "Poster edge", tier: "free", category: "Cinema" },
  { id: "dashed", label: "Dashed", tier: "free", category: "Line" },
  { id: "dotted", label: "Dotted", tier: "free", category: "Line" },
  { id: "bevel", label: "Bevel", tier: "free", category: "Depth" },
  { id: "frost", label: "Frost glass", tier: "free", category: "Mood" },
  { id: "ember", label: "Ember edge", tier: "free", category: "Mood" },
  { id: "ocean", label: "Ocean edge", tier: "free", category: "Mood" },
  { id: "steel", label: "Steel plate", tier: "free", category: "Mood" },
  { id: "gold", label: "Gold trim", tier: "party", category: "Party" },
  { id: "neon-party", label: "Neon party", tier: "party", category: "Party" },
  { id: "host", label: "Host frame", tier: "party", category: "Party" },
  { id: "vip", label: "VIP frame", tier: "party", category: "Party" },
  { id: "burst", label: "Burst frame", tier: "party", category: "Party" },
];

const THEME_IDS = new Set(PROFILE_THEMES.map((t) => t.id));
const BORDER_IDS = new Set(BORDER_STYLES.map((b) => b.id));

export function sanitizeHexColor(raw: string, fallback = "#2dd4bf"): string {
  const s = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function sanitizeAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const ok =
      host === "api.dicebear.com" ||
      host.endsWith(".googleusercontent.com") ||
      host.endsWith(".fbcdn.net") ||
      host === "i.imgur.com" ||
      host === "imgur.com" ||
      host.endsWith(".twimg.com") ||
      host === "avatars.githubusercontent.com" ||
      host === "cdn.discordapp.com" ||
      /\.(jpe?g|png|gif|webp|svg)$/i.test(u.pathname);
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

export function dicebearAvatar(seed: string): string {
  return (
    dicebearUrlForStyle("avataaars", seed) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      seed.slice(0, 48) || "watcher"
    )}&backgroundColor=0b1210`
  );
}

export function normalizeProfileTheme(raw: string | null | undefined): ProfileThemeId {
  if (raw && THEME_IDS.has(raw)) return raw;
  return "classic";
}

export function normalizeBorderStyle(raw: string | null | undefined): BorderStyleId {
  if (raw && BORDER_IDS.has(raw)) return raw;
  return "soft";
}

export function parseFavoriteIds(json: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function profileLooksFromRow(row: {
  profileTheme?: string | null;
  borderStyle?: string | null;
  accentColor?: string | null;
  accentPalette?: string | null;
  avatarUrl?: string | null;
  avatarHue?: number | null;
  avatarStyle?: string | null;
  avatarFrame?: string | null;
  bannerStyle?: string | null;
  patternOverlay?: string | null;
  nameplateStyle?: string | null;
  profileBadgeIdsJson?: string | null;
  favoriteMovieIdsJson?: string | null;
}): ProfileLooks {
  const theme = normalizeProfileTheme(row.profileTheme);
  const themeMeta = PROFILE_THEMES.find((t) => t.id === theme)!;
  const palette = normalizeAccentPalette(row.accentPalette);
  const accentFromPalette =
    palette !== "custom" ? paletteHex(palette, themeMeta.defaultAccent) : null;
  return {
    profileTheme: theme,
    borderStyle: normalizeBorderStyle(row.borderStyle),
    accentPalette: palette,
    accentColor: sanitizeHexColor(
      accentFromPalette || row.accentColor || themeMeta.defaultAccent,
      themeMeta.defaultAccent
    ),
    avatarUrl: sanitizeAvatarUrl(row.avatarUrl),
    avatarHue: Number.isFinite(row.avatarHue) ? Number(row.avatarHue) : 168,
    avatarStyle: normalizeAvatarStyle(row.avatarStyle),
    avatarFrame: normalizeAvatarFrame(row.avatarFrame),
    bannerStyle: normalizeBannerStyle(row.bannerStyle),
    patternOverlay: normalizePatternOverlay(row.patternOverlay),
    nameplateStyle: normalizeNameplateStyle(row.nameplateStyle),
    profileBadgeIds: parseProfileBadgeIds(row.profileBadgeIdsJson),
    favoriteMovieIds: parseFavoriteIds(row.favoriteMovieIdsJson),
  };
}

/** Honest catalog + combination counts (not a fake “hundreds” claim). */
export function profileLooksCatalogStats(opts?: { includeParty?: boolean }) {
  const party = Boolean(opts?.includeParty);
  const take = <T extends { tier: "free" | "party" }>(arr: T[]) =>
    party ? arr : arr.filter((x) => x.tier === "free");

  const themes = take(PROFILE_THEMES).length;
  const borders = take(BORDER_STYLES).length;
  const avatarStyles = take(AVATAR_STYLES).length;
  const avatarFrames = take(AVATAR_FRAMES).length;
  const banners = take(BANNER_STYLES).length;
  const palettes = take(ACCENT_PALETTES).length;
  const patterns = take(PATTERN_OVERLAYS).length;
  const nameplates = take(NAMEPLATE_STYLES).length;
  const badges = take(PROFILE_BADGES).length;

  const coreCombo = multiplyCombinations([
    themes,
    borders,
    avatarStyles,
    avatarFrames,
    banners,
    palettes,
    patterns,
    nameplates,
  ]);
  // Equipping 0–3 distinct badges adds more looks; lower-bound with core only.
  return {
    themes,
    borders,
    avatarStyles,
    avatarFrames,
    banners,
    palettes,
    patterns,
    nameplates,
    badges,
    optionSlots:
      themes +
      borders +
      avatarStyles +
      avatarFrames +
      banners +
      palettes +
      patterns +
      nameplates +
      badges,
    uniqueLooks: coreCombo,
  };
}

export {
  ACCENT_PALETTES,
  AVATAR_FRAMES,
  AVATAR_STYLES,
  BANNER_STYLES,
  NAMEPLATE_STYLES,
  PATTERN_OVERLAYS,
  PROFILE_BADGES,
  bannerCss,
  dicebearUrlForStyle,
  filterByPlan,
  normalizeAccentPalette,
  normalizeAvatarFrame,
  normalizeAvatarStyle,
  normalizeBannerStyle,
  normalizeNameplateStyle,
  normalizePatternOverlay,
  paletteHex,
  parseProfileBadgeIds,
  planAllowsTier,
  sanitizeProfileBadgeIds,
} from "./profile-cosmetics";

export type {
  AccentPaletteId,
  AvatarFrameId,
  AvatarStyleId,
  BannerStyleId,
  NameplateStyleId,
  PatternOverlayId,
  ProfileBadgeId,
} from "./profile-cosmetics";
