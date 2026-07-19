/** Fixed profile look templates — no user HTML. */

export type ProfileThemeId =
  | "classic"
  | "neon"
  | "cinema"
  | "coral"
  | "midnight";

export type BorderStyleId = "soft" | "sharp" | "double" | "glow";

export type ProfileLooks = {
  profileTheme: ProfileThemeId;
  borderStyle: BorderStyleId;
  accentColor: string;
  avatarUrl: string | null;
  avatarHue: number;
  favoriteMovieIds: string[];
};

export const PROFILE_THEMES: {
  id: ProfileThemeId;
  label: string;
  blurb: string;
  defaultAccent: string;
}[] = [
  {
    id: "classic",
    label: "Classic stage",
    blurb: "Watchify teal — clean and familiar",
    defaultAccent: "#2dd4bf",
  },
  {
    id: "neon",
    label: "Neon night",
    blurb: "Electric cyan glow for party hosts",
    defaultAccent: "#22d3ee",
  },
  {
    id: "cinema",
    label: "Cinema gold",
    blurb: "Warm amber theater lights",
    defaultAccent: "#f0b429",
  },
  {
    id: "coral",
    label: "Sunset coral",
    blurb: "Soft peach energy without purple clutter",
    defaultAccent: "#fb7185",
  },
  {
    id: "midnight",
    label: "Midnight blue",
    blurb: "Cool steel for a quieter vibe",
    defaultAccent: "#60a5fa",
  },
];

export const BORDER_STYLES: { id: BorderStyleId; label: string }[] = [
  { id: "soft", label: "Soft round" },
  { id: "sharp", label: "Sharp" },
  { id: "double", label: "Double frame" },
  { id: "glow", label: "Glow frame" },
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
    // Allow common image hosts + dicebear presets
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
  const s = encodeURIComponent(seed.slice(0, 48) || "watcher");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=0b1210`;
}

export function normalizeProfileTheme(raw: string | null | undefined): ProfileThemeId {
  if (raw && THEME_IDS.has(raw as ProfileThemeId)) return raw as ProfileThemeId;
  return "classic";
}

export function normalizeBorderStyle(raw: string | null | undefined): BorderStyleId {
  if (raw && BORDER_IDS.has(raw as BorderStyleId)) return raw as BorderStyleId;
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
  avatarUrl?: string | null;
  avatarHue?: number | null;
  favoriteMovieIdsJson?: string | null;
}): ProfileLooks {
  const theme = normalizeProfileTheme(row.profileTheme);
  const themeMeta = PROFILE_THEMES.find((t) => t.id === theme)!;
  return {
    profileTheme: theme,
    borderStyle: normalizeBorderStyle(row.borderStyle),
    accentColor: sanitizeHexColor(
      row.accentColor || themeMeta.defaultAccent,
      themeMeta.defaultAccent
    ),
    avatarUrl: sanitizeAvatarUrl(row.avatarUrl),
    avatarHue: Number.isFinite(row.avatarHue) ? Number(row.avatarHue) : 168,
    favoriteMovieIds: parseFavoriteIds(row.favoriteMovieIdsJson),
  };
}
