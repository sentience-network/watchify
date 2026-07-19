import type { FavoritePerson } from "./types";

export type PersonCard = {
  id: number;
  name: string;
  department: FavoritePerson["department"];
  knownFor?: string;
  profilePath?: string | null;
  popularity?: number;
  biography?: string;
};

export function personPosterUrl(profilePath: string | null | undefined): string {
  if (!profilePath) return "/poster-fallback.svg";
  if (profilePath.startsWith("http")) return profilePath;
  return `https://image.tmdb.org/t/p/w185${profilePath}`;
}
