import { prisma } from "@/lib/db";
import { CATALOG } from "@/lib/movies";
import { openToken, sealToken } from "./sealed-token";

const API = "https://api.trakt.tv";
export const traktConfigured = () =>
  Boolean(process.env.TRAKT_CLIENT_ID && process.env.TRAKT_CLIENT_SECRET && process.env.TRAKT_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_SECRET);

export function mapTraktTitle(title: string, year?: number | null) {
  const normalized = title.trim().toLocaleLowerCase();
  return CATALOG.find((movie) =>
    movie.title.toLocaleLowerCase() === normalized && (!year || movie.year === year)
  )?.id ?? null;
}

async function traktFetch(path: string, token: string) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
      "trakt-api-version": "2",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Trakt returned ${response.status}`);
  return response.json();
}

export async function exchangeTraktCode(userId: string, code: string) {
  if (!traktConfigured()) throw new Error("Trakt is not configured");
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: process.env.TRAKT_REDIRECT_URI,
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
    const token = openToken(connection.accessTokenCiphertext);
    // Trakt exposes watched history; it does not provide reliable third-party player presence.
    const history = await traktFetch("/sync/history?limit=50", token) as TraktItem[];
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
