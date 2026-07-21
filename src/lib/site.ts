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
  "Watch together on the apps you already stream — and on Watchify Free legal titles plus community uploads. Parties, presence, and shared taste. Not licensed Netflix in-app.";

export function absoluteUrl(path: string): string {
  const base = getAppUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}
