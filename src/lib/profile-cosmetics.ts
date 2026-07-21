/**
 * Curated profile cosmetics — fixed ids only (no user HTML).
 * Uniqueness is combinatorial: themes × frames × banners × palettes ×
 * overlays × nameplates × avatar styles × avatar frames × badges.
 */

import type { PlanId } from "./plans";

export type CosmeticTier = "free" | "party";

export type CosmeticOption<T extends string = string> = {
  id: T;
  label: string;
  blurb?: string;
  category: string;
  tier: CosmeticTier;
};

/** Dicebear 7.x styles + local hue initials + custom photo URL. */
export type AvatarStyleId = string;
export type AvatarFrameId = string;
export type BannerStyleId = string;
export type AccentPaletteId = string;
export type PatternOverlayId = string;
export type NameplateStyleId = string;
export type ProfileBadgeId = string;

export const AVATAR_STYLES: (CosmeticOption & {
  dicebear?: string;
})[] = [
  { id: "hue", label: "Hue initials", blurb: "Color circle + letters", category: "Local", tier: "free" },
  { id: "photo", label: "Custom photo", blurb: "Your https image URL", category: "Local", tier: "free" },
  { id: "avataaars", label: "Avataaars", category: "Cartoon", tier: "free", dicebear: "avataaars" },
  { id: "lorelei", label: "Lorelei", category: "Cartoon", tier: "free", dicebear: "lorelei" },
  { id: "notionists", label: "Notionists", category: "Cartoon", tier: "free", dicebear: "notionists" },
  { id: "personas", label: "Personas", category: "Cartoon", tier: "free", dicebear: "personas" },
  { id: "micah", label: "Micah", category: "Cartoon", tier: "free", dicebear: "micah" },
  { id: "adventurer", label: "Adventurer", category: "Cartoon", tier: "free", dicebear: "adventurer" },
  { id: "big-smile", label: "Big smile", category: "Cartoon", tier: "free", dicebear: "big-smile" },
  { id: "big-ears", label: "Big ears", category: "Cartoon", tier: "free", dicebear: "big-ears" },
  { id: "open-peeps", label: "Open peeps", category: "Cartoon", tier: "free", dicebear: "open-peeps" },
  { id: "croodles", label: "Croodles", category: "Doodle", tier: "free", dicebear: "croodles" },
  { id: "fun-emoji", label: "Fun emoji", category: "Doodle", tier: "free", dicebear: "fun-emoji" },
  { id: "bottts", label: "Bottts", category: "Robot", tier: "free", dicebear: "bottts" },
  { id: "shapes", label: "Shapes", category: "Abstract", tier: "free", dicebear: "shapes" },
  { id: "rings", label: "Rings", category: "Abstract", tier: "free", dicebear: "rings" },
  { id: "identicon", label: "Identicon", category: "Abstract", tier: "free", dicebear: "identicon" },
  { id: "thumbs", label: "Thumbs", category: "Abstract", tier: "free", dicebear: "thumbs" },
  { id: "pixel-art", label: "Pixel art", category: "Retro", tier: "free", dicebear: "pixel-art" },
  { id: "miniavs", label: "Miniavs", category: "Cartoon", tier: "free", dicebear: "miniavs" },
  { id: "icons", label: "Icons", category: "Abstract", tier: "party", dicebear: "icons" },
  { id: "adventurer-neutral", label: "Adventurer soft", category: "Cartoon", tier: "party", dicebear: "adventurer-neutral" },
  { id: "lorelei-neutral", label: "Lorelei soft", category: "Cartoon", tier: "party", dicebear: "lorelei-neutral" },
  { id: "bottts-neutral", label: "Bottts soft", category: "Robot", tier: "party", dicebear: "bottts-neutral" },
  { id: "notionists-neutral", label: "Notionists soft", category: "Cartoon", tier: "party", dicebear: "notionists-neutral" },
  { id: "pixel-art-neutral", label: "Pixel soft", category: "Retro", tier: "party", dicebear: "pixel-art-neutral" },
];

export const AVATAR_FRAMES: CosmeticOption[] = [
  { id: "none", label: "No frame", category: "Basic", tier: "free" },
  { id: "soft-ring", label: "Soft ring", category: "Basic", tier: "free" },
  { id: "sharp-ring", label: "Sharp ring", category: "Basic", tier: "free" },
  { id: "double-ring", label: "Double ring", category: "Basic", tier: "free" },
  { id: "glow-ring", label: "Glow ring", category: "Basic", tier: "free" },
  { id: "dashed", label: "Dashed", category: "Basic", tier: "free" },
  { id: "dotted", label: "Dotted", category: "Basic", tier: "free" },
  { id: "hex", label: "Hexagon", category: "Shape", tier: "free" },
  { id: "ticket", label: "Ticket stub", category: "Cinema", tier: "free" },
  { id: "film-reel", label: "Film reel", category: "Cinema", tier: "free" },
  { id: "popcorn", label: "Popcorn", category: "Cinema", tier: "free" },
  { id: "marquee", label: "Marquee lights", category: "Cinema", tier: "free" },
  { id: "pulse", label: "Pulse", category: "Motion", tier: "free" },
  { id: "orbit", label: "Orbit", category: "Motion", tier: "free" },
  { id: "spark", label: "Spark", category: "Motion", tier: "free" },
  { id: "frost", label: "Frost", category: "Mood", tier: "free" },
  { id: "ember", label: "Ember", category: "Mood", tier: "free" },
  { id: "ocean", label: "Ocean", category: "Mood", tier: "free" },
  { id: "steel", label: "Steel", category: "Mood", tier: "free" },
  { id: "gold-leaf", label: "Gold leaf", category: "Premium", tier: "party" },
  { id: "neon-arc", label: "Neon arc", category: "Premium", tier: "party" },
  { id: "crown", label: "Host crown", category: "Premium", tier: "party" },
  { id: "party-burst", label: "Party burst", category: "Premium", tier: "party" },
  { id: "vip", label: "VIP seal", category: "Premium", tier: "party" },
];

export const BANNER_STYLES: (CosmeticOption & { css: string })[] = [
  { id: "none", label: "No banner", category: "Basic", tier: "free", css: "none" },
  {
    id: "teal-wash",
    label: "Teal wash",
    category: "Wash",
    tier: "free",
    css: "linear-gradient(90deg, rgba(45,212,191,0.55), transparent 70%)",
  },
  {
    id: "amber-wash",
    label: "Amber wash",
    category: "Wash",
    tier: "free",
    css: "linear-gradient(90deg, rgba(240,180,41,0.5), transparent 70%)",
  },
  {
    id: "coral-wash",
    label: "Coral wash",
    category: "Wash",
    tier: "free",
    css: "linear-gradient(90deg, rgba(251,113,133,0.5), transparent 70%)",
  },
  {
    id: "sky-wash",
    label: "Sky wash",
    category: "Wash",
    tier: "free",
    css: "linear-gradient(90deg, rgba(56,189,248,0.5), transparent 70%)",
  },
  {
    id: "forest-wash",
    label: "Forest wash",
    category: "Wash",
    tier: "free",
    css: "linear-gradient(90deg, rgba(52,211,153,0.45), transparent 70%)",
  },
  {
    id: "cinema-stripe",
    label: "Cinema stripe",
    category: "Cinema",
    tier: "free",
    css: "repeating-linear-gradient(90deg, #1a1208 0 12px, #f0b42933 12px 24px)",
  },
  {
    id: "ticket-perforation",
    label: "Ticket edge",
    category: "Cinema",
    tier: "free",
    css: "linear-gradient(180deg, #2dd4bf44, transparent), radial-gradient(circle at 8px 50%, transparent 6px, #0b1210 7px)",
  },
  {
    id: "horizon",
    label: "Horizon",
    category: "Gradient",
    tier: "free",
    css: "linear-gradient(180deg, #22d3ee55, #0b121000 90%)",
  },
  {
    id: "dusk",
    label: "Dusk",
    category: "Gradient",
    tier: "free",
    css: "linear-gradient(135deg, #fb718555, #60a5fa33, transparent)",
  },
  {
    id: "midnight-flare",
    label: "Midnight flare",
    category: "Gradient",
    tier: "free",
    css: "radial-gradient(ellipse at 80% 0%, #60a5fa55, transparent 55%)",
  },
  {
    id: "ember-rise",
    label: "Ember rise",
    category: "Gradient",
    tier: "free",
    css: "radial-gradient(ellipse at 20% 100%, #f9731655, transparent 55%)",
  },
  {
    id: "mint-mesh",
    label: "Mint mesh",
    category: "Mesh",
    tier: "free",
    css: "radial-gradient(at 20% 30%, #2dd4bf44 0, transparent 40%), radial-gradient(at 80% 20%, #a7f3d044 0, transparent 35%)",
  },
  {
    id: "gold-mesh",
    label: "Gold mesh",
    category: "Mesh",
    tier: "free",
    css: "radial-gradient(at 30% 20%, #f0b42944 0, transparent 40%), radial-gradient(at 70% 40%, #fbbf2444 0, transparent 35%)",
  },
  {
    id: "aurora",
    label: "Aurora",
    category: "Mesh",
    tier: "free",
    css: "linear-gradient(120deg, #2dd4bf44, #38bdf844, #a78bfa22, transparent)",
  },
  {
    id: "velvet",
    label: "Velvet night",
    category: "Mood",
    tier: "free",
    css: "linear-gradient(180deg, #0f172aee, #15221ecc)",
  },
  {
    id: "stage-lights",
    label: "Stage lights",
    category: "Mood",
    tier: "free",
    css: "radial-gradient(circle at 15% 0%, #f0b42966, transparent 25%), radial-gradient(circle at 85% 0%, #2dd4bf55, transparent 25%)",
  },
  {
    id: "rain",
    label: "Rain lines",
    category: "Texture",
    tier: "free",
    css: "repeating-linear-gradient(105deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px)",
  },
  {
    id: "scan",
    label: "Scan sweep",
    category: "Texture",
    tier: "free",
    css: "linear-gradient(180deg, transparent 40%, #2dd4bf22 50%, transparent 60%)",
  },
  {
    id: "spotlight",
    label: "Spotlight",
    category: "Cinema",
    tier: "free",
    css: "radial-gradient(ellipse at 50% -20%, #ffffff33, transparent 50%)",
  },
  {
    id: "host-ribbon",
    label: "Host ribbon",
    category: "Party",
    tier: "party",
    css: "linear-gradient(90deg, #f0b42988, #2dd4bf66, #38bdf855)",
  },
  {
    id: "party-confetti",
    label: "Party confetti",
    category: "Party",
    tier: "party",
    css: "radial-gradient(circle at 10% 40%, #f0b42988 0 3px, transparent 4px), radial-gradient(circle at 30% 20%, #2dd4bf88 0 2px, transparent 3px), radial-gradient(circle at 70% 50%, #fb718588 0 3px, transparent 4px), radial-gradient(circle at 90% 30%, #38bdf888 0 2px, transparent 3px), linear-gradient(90deg, #15221eaa, transparent)",
  },
  {
    id: "vip-stripe",
    label: "VIP stripe",
    category: "Party",
    tier: "party",
    css: "linear-gradient(90deg, #f0b429aa 0 28%, transparent 28%)",
  },
  {
    id: "neon-highway",
    label: "Neon highway",
    category: "Party",
    tier: "party",
    css: "linear-gradient(90deg, #22d3ee88, transparent 40%), linear-gradient(270deg, #fb718588, transparent 40%)",
  },
];

export const ACCENT_PALETTES: (CosmeticOption & { hex: string })[] = [
  { id: "teal", label: "Stage teal", category: "Brand", tier: "free", hex: "#2dd4bf" },
  { id: "cyan", label: "Electric cyan", category: "Brand", tier: "free", hex: "#22d3ee" },
  { id: "amber", label: "Cinema gold", category: "Brand", tier: "free", hex: "#f0b429" },
  { id: "coral", label: "Sunset coral", category: "Brand", tier: "free", hex: "#fb7185" },
  { id: "sky", label: "Sky blue", category: "Cool", tier: "free", hex: "#60a5fa" },
  { id: "mint", label: "Fresh mint", category: "Cool", tier: "free", hex: "#34d399" },
  { id: "seafoam", label: "Seafoam", category: "Cool", tier: "free", hex: "#5eead4" },
  { id: "steel", label: "Steel", category: "Cool", tier: "free", hex: "#94a3b8" },
  { id: "orange", label: "Ember orange", category: "Warm", tier: "free", hex: "#fb923c" },
  { id: "rose", label: "Rose", category: "Warm", tier: "free", hex: "#fda4af" },
  { id: "sand", label: "Sand", category: "Warm", tier: "free", hex: "#e7c27d" },
  { id: "lime", label: "Lime", category: "Bright", tier: "free", hex: "#a3e635" },
  { id: "white", label: "Spotlight white", category: "Bright", tier: "free", hex: "#e2e8f0" },
  { id: "custom", label: "Custom hex", blurb: "Pick any accent", category: "Custom", tier: "free", hex: "#2dd4bf" },
  { id: "champagne", label: "Champagne", category: "Party", tier: "party", hex: "#f5e6c8" },
  { id: "laser", label: "Laser pink", category: "Party", tier: "party", hex: "#f472b6" },
  { id: "volt", label: "Volt green", category: "Party", tier: "party", hex: "#bef264" },
  { id: "cobalt", label: "Host cobalt", category: "Party", tier: "party", hex: "#3b82f6" },
];

export const PATTERN_OVERLAYS: CosmeticOption[] = [
  { id: "none", label: "No pattern", category: "Basic", tier: "free" },
  { id: "dots", label: "Dots", category: "Texture", tier: "free" },
  { id: "grid", label: "Grid", category: "Texture", tier: "free" },
  { id: "diagonal", label: "Diagonal", category: "Texture", tier: "free" },
  { id: "film-grain", label: "Film grain", category: "Cinema", tier: "free" },
  { id: "scanlines", label: "Scanlines", category: "Cinema", tier: "free" },
  { id: "halftone", label: "Halftone", category: "Cinema", tier: "free" },
  { id: "waves", label: "Waves", category: "Mood", tier: "free" },
  { id: "noise", label: "Soft noise", category: "Mood", tier: "free" },
  { id: "stars", label: "Stars", category: "Mood", tier: "free" },
  { id: "circuit", label: "Circuit", category: "Party", tier: "party" },
  { id: "confetti", label: "Confetti dust", category: "Party", tier: "party" },
];

export const NAMEPLATE_STYLES: CosmeticOption[] = [
  { id: "classic", label: "Classic", category: "Basic", tier: "free" },
  { id: "subtitle", label: "Subtitle", category: "Basic", tier: "free" },
  { id: "ticket", label: "Ticket stub", category: "Cinema", tier: "free" },
  { id: "marquee", label: "Marquee", category: "Cinema", tier: "free" },
  { id: "credit-roll", label: "Credit roll", category: "Cinema", tier: "free" },
  { id: "neon-sign", label: "Neon sign", category: "Glow", tier: "free" },
  { id: "outline", label: "Outline", category: "Glow", tier: "free" },
  { id: "underline", label: "Accent underline", category: "Basic", tier: "free" },
  { id: "badge", label: "Name badge", category: "Basic", tier: "free" },
  { id: "whisper", label: "Whisper", category: "Mood", tier: "free" },
  { id: "billboard", label: "Billboard", category: "Party", tier: "party" },
  { id: "host-plaque", label: "Host plaque", category: "Party", tier: "party" },
];

export const PROFILE_BADGES: CosmeticOption[] = [
  { id: "early-bird", label: "Early bird", category: "Launch", tier: "free" },
  { id: "night-owl", label: "Night owl", category: "Launch", tier: "free" },
  { id: "binge", label: "Binge mode", category: "Watch", tier: "free" },
  { id: "critic", label: "Armchair critic", category: "Watch", tier: "free" },
  { id: "comfort", label: "Comfort rewatch", category: "Watch", tier: "free" },
  { id: "indie", label: "Indie radar", category: "Taste", tier: "free" },
  { id: "blockbuster", label: "Blockbuster", category: "Taste", tier: "free" },
  { id: "foreign", label: "World cinema", category: "Taste", tier: "free" },
  { id: "doc", label: "Doc hunter", category: "Taste", tier: "free" },
  { id: "horror", label: "Horror night", category: "Genre", tier: "free" },
  { id: "comedy", label: "Comedy club", category: "Genre", tier: "free" },
  { id: "scifi", label: "Sci-fi bay", category: "Genre", tier: "free" },
  { id: "romance", label: "Rom-com", category: "Genre", tier: "free" },
  { id: "action", label: "Action cut", category: "Genre", tier: "free" },
  { id: "friend", label: "Friend glue", category: "Social", tier: "free" },
  { id: "host", label: "Party host", category: "Social", tier: "free" },
  { id: "cohost", label: "Co-host", category: "Social", tier: "free" },
  { id: "queue", label: "Queue curator", category: "Social", tier: "free" },
  { id: "soft-launch", label: "Soft launch", category: "Launch", tier: "free" },
  { id: "founder", label: "Founder circle", category: "Launch", tier: "party" },
  { id: "vip-host", label: "VIP host", category: "Party", tier: "party" },
  { id: "marathon", label: "Marathon captain", category: "Party", tier: "party" },
  { id: "premiere", label: "Premiere night", category: "Party", tier: "party" },
  { id: "legend", label: "Watch legend", category: "Party", tier: "party" },
];

const AVATAR_STYLE_IDS = new Set(AVATAR_STYLES.map((x) => x.id));
const AVATAR_FRAME_IDS = new Set(AVATAR_FRAMES.map((x) => x.id));
const BANNER_IDS = new Set(BANNER_STYLES.map((x) => x.id));
const PALETTE_IDS = new Set(ACCENT_PALETTES.map((x) => x.id));
const PATTERN_IDS = new Set(PATTERN_OVERLAYS.map((x) => x.id));
const NAMEPLATE_IDS = new Set(NAMEPLATE_STYLES.map((x) => x.id));
const BADGE_IDS = new Set(PROFILE_BADGES.map((x) => x.id));

export function planAllowsTier(plan: PlanId | string | null | undefined, tier: CosmeticTier): boolean {
  if (tier === "free") return true;
  return plan === "party";
}

export function filterByPlan<T extends { tier: CosmeticTier }>(
  options: T[],
  plan: PlanId | string | null | undefined
): T[] {
  return options.filter((o) => planAllowsTier(plan, o.tier));
}

export function normalizeAvatarStyle(raw: string | null | undefined): AvatarStyleId {
  if (raw && AVATAR_STYLE_IDS.has(raw)) return raw;
  return "hue";
}

export function normalizeAvatarFrame(raw: string | null | undefined): AvatarFrameId {
  if (raw && AVATAR_FRAME_IDS.has(raw)) return raw;
  return "soft-ring";
}

export function normalizeBannerStyle(raw: string | null | undefined): BannerStyleId {
  if (raw && BANNER_IDS.has(raw)) return raw;
  return "none";
}

export function normalizeAccentPalette(raw: string | null | undefined): AccentPaletteId {
  if (raw && PALETTE_IDS.has(raw)) return raw;
  return "teal";
}

export function normalizePatternOverlay(raw: string | null | undefined): PatternOverlayId {
  if (raw && PATTERN_IDS.has(raw)) return raw;
  return "none";
}

export function normalizeNameplateStyle(raw: string | null | undefined): NameplateStyleId {
  if (raw && NAMEPLATE_IDS.has(raw)) return raw;
  return "classic";
}

export function parseProfileBadgeIds(json: string | null | undefined): ProfileBadgeId[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string" && BADGE_IDS.has(x))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function sanitizeProfileBadgeIds(
  ids: unknown,
  plan?: PlanId | string | null
): ProfileBadgeId[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((x): x is string => typeof x === "string" && BADGE_IDS.has(x))
    .filter((id) => {
      const meta = PROFILE_BADGES.find((b) => b.id === id);
      return meta ? planAllowsTier(plan, meta.tier) : false;
    })
    .slice(0, 3);
}

export function dicebearUrlForStyle(styleId: string, seed: string): string | null {
  const meta = AVATAR_STYLES.find((s) => s.id === styleId);
  if (!meta?.dicebear) return null;
  const s = encodeURIComponent(seed.slice(0, 48) || "watcher");
  return `https://api.dicebear.com/7.x/${meta.dicebear}/svg?seed=${s}&backgroundColor=0b1210`;
}

export function bannerCss(id: string): string {
  return BANNER_STYLES.find((b) => b.id === id)?.css || "none";
}

export function paletteHex(id: string, fallback = "#2dd4bf"): string {
  const p = ACCENT_PALETTES.find((x) => x.id === id);
  return p && p.id !== "custom" ? p.hex : fallback;
}

/** Catalog sizes for marketing / UI honesty. */
export function profileCosmeticCatalogStats(plan?: PlanId | string | null) {
  const freeOnly = plan === "free" || plan === "plus" || plan == null;
  const take = <T extends { tier: CosmeticTier }>(arr: T[]) =>
    freeOnly ? arr.filter((x) => x.tier === "free") : arr;

  const themes = take; // filled by caller with theme lists
  return {
    avatarStyles: take(AVATAR_STYLES).length,
    avatarFrames: take(AVATAR_FRAMES).length,
    banners: take(BANNER_STYLES).length,
    palettes: take(ACCENT_PALETTES).length,
    patterns: take(PATTERN_OVERLAYS).length,
    nameplates: take(NAMEPLATE_STYLES).length,
    badges: take(PROFILE_BADGES).length,
    /** Placeholder — multiply with themes/borders from profile-themes */
    _themesHelper: themes,
  };
}

export function multiplyCombinations(counts: number[]): number {
  return counts.reduce((a, b) => a * b, 1);
}
