/**
 * TMDB CDN paths rotate; remap known-dead hashes so the UI never 404s.
 */

const WORKING = [
  "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
  "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
  "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
  "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  "/aQPeznSu7XDTrrdCtT5eLiu52Yu.jpg",
  "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
] as const;

const DEAD = new Set([
  "/1pdfLvkbY9ohJlCjQH2CNhyPJrU.jpg",
  "/w3L4VGOqehOEvekIZD0dgYiJk0k.jpg",
  "/74xTEgt7R36Fpooo27dUoIUdoSB.jpg",
  "/k3m2ate0YSXbfMsM8BPliLZlJmH.jpg",
  "/fptnZJr41NWwKpdH0AaYs2xCWXu.jpg",
  "/7IiTTgloJzvGI1TAYymCfbfl3E9.jpg",
  "/7fn624DJ5EG0c747RGkQnSwjkgl.jpg",
  "/tFXcEIjw1bLuy4eSjs5rUkm18KO.jpg",
  "/kCGB0oHxS21W4JkT8eC7gkycjBV.jpg",
  "/r2J02Z2OpNTzyfUjrp6qycePUUl.jpg",
  "/AcK1FCPIwTx0MOP28e5yxl0zpTs.jpg",
  "/9n2tJBplPbgR2ca05hSMlFFoN1k.jpg",
  "/hUuYbntC3yx38Sn2u1hLhYTbZWr.jpg",
  "/4911T5FbJ9eD2FmeqP7UlTNfg64.jpg",
  "/n0ybepvW3W4476Yrdv9JriKoz82.jpg",
]);

const TITLE_OVERRIDES: Record<string, string> = {
  m1: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  m2: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  m4: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  m5: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  m10: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  m22: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  m34: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  m36: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
};

function hashPick(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return WORKING[h % WORKING.length];
}

export function resolvePosterPath(movieId: string, posterPath: string): string {
  if (posterPath.startsWith("http://") || posterPath.startsWith("https://")) {
    return posterPath;
  }
  if (TITLE_OVERRIDES[movieId]) return TITLE_OVERRIDES[movieId];
  if (DEAD.has(posterPath)) return hashPick(movieId || posterPath);
  return posterPath;
}

export function isAbsolutePoster(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://");
}
