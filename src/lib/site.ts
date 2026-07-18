/** Site-wide URL + SEO helpers. Prefer NEXT_PUBLIC_APP_URL in production. */

export function getAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3344";
}

export const SITE_NAME = "Watchify";
export const SITE_TAGLINE = "Spotify for movies";
export const SITE_DESCRIPTION =
  "Discover films, build watchlists, host watch parties, and share what you're watching with friends on Watchify.";

export function absoluteUrl(path: string): string {
  const base = getAppUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}
