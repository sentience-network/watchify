export type FriendCircle = {
  id: string;
  name: string;
  memberIds: string[];
};

export function parseFriendCircles(raw: unknown): FriendCircle[] {
  if (!Array.isArray(raw)) return [];
  const out: FriendCircle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.slice(0, 40) : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 40) : "";
    const memberIds = Array.isArray(o.memberIds)
      ? o.memberIds.filter((x): x is string => typeof x === "string").slice(0, 40)
      : [];
    if (!id || !name) continue;
    out.push({ id, name, memberIds });
  }
  return out.slice(0, 12);
}

export function newCircleId() {
  return `fc_${Math.random().toString(36).slice(2, 10)}`;
}
