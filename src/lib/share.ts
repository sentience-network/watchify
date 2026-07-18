import { absoluteUrl } from "./site";

export function watchlistShareUrl(watchlistId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}/share/watchlist/${watchlistId}`;
  return absoluteUrl(`/share/watchlist/${watchlistId}`);
}

export function profileShareUrl(userId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}/profile/${userId}`;
  return absoluteUrl(`/profile/${userId}`);
}

export function activityShareUrl(activityId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}/share/activity/${activityId}`;
  return absoluteUrl(`/share/activity/${activityId}`);
}

export function partyShareUrl(partyId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}/share/party/${partyId}`;
  return absoluteUrl(`/share/party/${partyId}`);
}

export function watchingShareUrl(userId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (base) return `${base}/share/watching/${userId}`;
  return absoluteUrl(`/share/watching/${userId}`);
}

export type SharePlatformId =
  | "x"
  | "facebook"
  | "reddit"
  | "linkedin"
  | "whatsapp"
  | "telegram"
  | "sms"
  | "email"
  | "instagram"
  | "tiktok"
  | "snapchat"
  | "copy"
  | "native";

export type ShareIntentKind = "direct" | "copy_then_open" | "native_or_copy";

export type SharePlatform = {
  id: SharePlatformId;
  label: string;
  kind: ShareIntentKind;
  /** Honest note shown in UI when platform can't deep-compose a post */
  honesty?: string;
};

export const SHARE_PLATFORMS: SharePlatform[] = [
  { id: "native", label: "Device share…", kind: "native_or_copy" },
  { id: "x", label: "X / Twitter", kind: "direct" },
  { id: "facebook", label: "Facebook", kind: "direct" },
  {
    id: "instagram",
    label: "Instagram",
    kind: "copy_then_open",
    honesty:
      "Instagram has no reliable web share intent. We copy the link — paste it in a Story, post, or DM after opening Instagram.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    kind: "copy_then_open",
    honesty:
      "TikTok doesn't support composing a post from the web. We copy the link — open TikTok and paste it in a caption or bio.",
  },
  { id: "reddit", label: "Reddit", kind: "direct" },
  { id: "linkedin", label: "LinkedIn", kind: "direct" },
  { id: "whatsapp", label: "WhatsApp", kind: "direct" },
  { id: "telegram", label: "Telegram", kind: "direct" },
  { id: "sms", label: "Messages / SMS", kind: "direct" },
  {
    id: "snapchat",
    label: "Snapchat",
    kind: "copy_then_open",
    honesty:
      "Snapchat web share is limited. We copy the link — open Snapchat and paste it in a Snap or chat.",
  },
  { id: "email", label: "Email", kind: "direct" },
  { id: "copy", label: "Copy link", kind: "direct" },
];

export function twitterIntent(text: string, url: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function facebookIntent(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function redditIntent(url: string, title: string) {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

export function linkedInIntent(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function whatsappIntent(text: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function telegramIntent(text: string, url: string) {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function smsIntent(text: string, url: string) {
  // iOS uses &body= ; Android often accepts ?body=
  const body = encodeURIComponent(`${text} ${url}`);
  return `sms:?&body=${body}`;
}

export function emailIntent(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Best-effort: open Instagram app/site (no compose intent). */
export function instagramOpenUrl() {
  return "https://www.instagram.com/";
}

/** Best-effort: open TikTok (no compose intent for arbitrary URLs). */
export function tiktokOpenUrl() {
  return "https://www.tiktok.com/upload?lang=en";
}

/** Best-effort: Snapchat web entry (paste after copy). */
export function snapchatOpenUrl() {
  return "https://www.snapchat.com/";
}

export function directShareHref(
  platform: SharePlatformId,
  opts: { url: string; title: string; text: string }
): string | null {
  const { url, title, text } = opts;
  switch (platform) {
    case "x":
      return twitterIntent(text, url);
    case "facebook":
      return facebookIntent(url);
    case "reddit":
      return redditIntent(url, title);
    case "linkedin":
      return linkedInIntent(url);
    case "whatsapp":
      return whatsappIntent(text, url);
    case "telegram":
      return telegramIntent(text, url);
    case "sms":
      return smsIntent(text, url);
    case "email":
      return emailIntent(title, `${text}\n\n${url}`);
    case "instagram":
      return instagramOpenUrl();
    case "tiktok":
      return tiktokOpenUrl();
    case "snapchat":
      return snapchatOpenUrl();
    default:
      return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function nativeShare(data: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "unavailable" | "cancelled"> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return "unavailable";
  }
  try {
    await navigator.share(data);
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "cancelled";
  }
}

/** Allow only https:// public profile URLs for known social hosts. */
export function validateSocialUrl(
  platform: "x" | "instagram" | "tiktok" | "letterboxd",
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: "" };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a full https:// URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only https:// links are allowed" };
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const allowed: Record<typeof platform, string[]> = {
    x: ["x.com", "twitter.com"],
    instagram: ["instagram.com"],
    tiktok: ["tiktok.com"],
    letterboxd: ["letterboxd.com"],
  };
  if (!allowed[platform].some((h) => host === h || host.endsWith(`.${h}`))) {
    return { ok: false, error: `URL must be a ${platform} profile link` };
  }
  return { ok: true, url: parsed.toString() };
}
