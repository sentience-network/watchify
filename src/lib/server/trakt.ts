import { prisma } from "@/lib/db";
import { CATALOG } from "@/lib/movies";
import { openToken, sealToken } from "./sealed-token";

const API = "https://api.trakt.tv";
const USER_AGENT = "Watchify/1.0 (+https://watchify-web-9rx1.onrender.com)";

/** Callback URL registered on the Trakt OAuth app — must match exactly. */
export function traktRedirectUri(): string {
  const explicit = process.env.TRAKT_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return base ? `${base}/api/trakt/callback` : "";
}

export const traktConfigured = () =>
  Boolean(
    process.env.TRAKT_CLIENT_ID?.trim() &&
      process.env.TRAKT_CLIENT_SECRET?.trim() &&
      traktRedirectUri() &&
      process.env.TOKEN_ENCRYPTION_SECRET
  );

export function mapTraktTitle(title: string, year?: number | null) {
  const normalized = title.trim().toLocaleLowerCase();
  return CATALOG.find((movie) =>
    movie.title.toLocaleLowerCase() === normalized && (!year || movie.year === year)
  )?.id ?? null;
}

function traktHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
    "trakt-api-version": "2",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function traktFetch(path: string, token: string) {
  const response = await fetch(`${API}${path}`, {
    headers: traktHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Trakt returned ${response.status}`);
  return response.json();
}

async function refreshAccessToken(userId: string, refreshCiphertext: string): Promise<string> {
  const refreshToken = openToken(refreshCiphertext);
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: traktHeaders(),
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: traktRedirectUri(),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Trakt token refresh failed (${response.status})`);
  const token = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    scope?: string;
  };
  await prisma.traktConnection.update({
    where: { userId },
    data: {
      accessTokenCiphertext: sealToken(token.access_token),
      refreshTokenCiphertext: sealToken(token.refresh_token),
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || "",
      lastSyncError: null,
    },
  });
  return token.access_token;
}

async function accessTokenFor(userId: string): Promise<string> {
  const connection = await prisma.traktConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Trakt is not connected");
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  const stale = expiresAt > 0 && expiresAt < Date.now() + 60_000;
  if (stale && connection.refreshTokenCiphertext) {
    return refreshAccessToken(userId, connection.refreshTokenCiphertext);
  }
  return openToken(connection.accessTokenCiphertext);
}

export async function exchangeTraktCode(userId: string, code: string) {
  if (!traktConfigured()) throw new Error("Trakt is not configured");
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: traktHeaders(),
    body: JSON.stringify({
      code,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: traktRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Trakt authorization failed (${response.status})`);
  const token = await response.json() as { access_token: string; refresh_token: string; expires_in?: number; scope?: string };
  await prisma.traktConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenCiphertext: sealToken(token.access_token),
      refreshTokenCiphertext: sealToken(token.refresh_token),
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || "",
    },
    update: {
      accessTokenCiphertext: sealToken(token.access_token),
      refreshTokenCiphertext: sealToken(token.refresh_token),
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || "",
      lastSyncError: null,
    },
  });
}

type TraktItem = {
  watched_at?: string;
  movie?: { title: string; year?: number; ids: { trakt?: number; imdb?: string; tmdb?: number } };
  episode?: { title: string; season?: number; number?: number; ids: { trakt?: number; imdb?: string; tmdb?: number } };
  show?: { title: string; year?: number; ids: { trakt?: number; imdb?: string; tmdb?: number } };
};

export async function syncTrakt(userId: string) {
  const connection = await prisma.traktConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Trakt is not connected");
  try {
    let token = await accessTokenFor(userId);
    let history: TraktItem[];
    try {
      history = await traktFetch("/sync/history?limit=50", token) as TraktItem[];
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("401") || !connection.refreshTokenCiphertext) throw error;
      token = await refreshAccessToken(userId, connection.refreshTokenCiphertext);
      history = await traktFetch("/sync/history?limit=50", token) as TraktItem[];
    }
    // Trakt exposes watched history; it does not provide reliable third-party player presence.
    await prisma.importedMedia.deleteMany({ where: { userId, source: "trakt" } });
    for (const item of history) {
      const media = item.movie || item.episode;
      if (!media) continue;
      const title = item.movie?.title || `${item.show?.title || "Unknown show"} — ${media.title}`;
      const year = item.movie?.year || item.show?.year || null;
      const sourceId = String(media.ids.trakt || media.ids.imdb || media.ids.tmdb || `${title}:${year}`);
      await prisma.importedMedia.create({
        data: {
          userId, source: "trakt", sourceId, mediaType: item.movie ? "movie" : "episode",
          title, year, catalogId: item.movie ? mapTraktTitle(item.movie.title, year) : null,
          watchedAt: item.watched_at ? new Date(item.watched_at) : null,
          metadataJson: JSON.stringify({ ids: media.ids }),
        },
      });
    }
    await prisma.traktConnection.update({
      where: { userId }, data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
    return history.length;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Sync failed";
    await prisma.traktConnection.update({ where: { userId }, data: { lastSyncError: message } });
    throw error;
  }
}
