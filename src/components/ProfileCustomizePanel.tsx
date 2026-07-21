"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CATALOG, freeMovies, searchMovies } from "@/lib/movies";
import { type PersonCard } from "@/lib/people";
import {
  ACCENT_PALETTES,
  AVATAR_FRAMES,
  AVATAR_STYLES,
  BANNER_STYLES,
  BORDER_STYLES,
  NAMEPLATE_STYLES,
  PATTERN_OVERLAYS,
  PROFILE_BADGES,
  PROFILE_THEMES,
  filterByPlan,
  profileLooksCatalogStats,
  type AccentPaletteId,
  type AvatarFrameId,
  type AvatarStyleId,
  type BannerStyleId,
  type BorderStyleId,
  type NameplateStyleId,
  type PatternOverlayId,
  type ProfileBadgeId,
  type ProfileThemeId,
} from "@/lib/profile-themes";
import type { FavoritePerson, Movie } from "@/lib/types";
import { useWatchify } from "@/lib/store";

type CosmeticTab =
  | "page"
  | "avatar"
  | "banner"
  | "name"
  | "badges"
  | "shelf";

type Props = {
  initial: {
    name: string;
    bio: string;
    avatarHue: number;
    avatarUrl?: string | null;
    profileTheme?: string;
    borderStyle?: string;
    accentColor?: string;
    accentPalette?: string;
    avatarStyle?: string;
    avatarFrame?: string;
    bannerStyle?: string;
    patternOverlay?: string;
    nameplateStyle?: string;
    profileBadgeIds?: string[];
    favoriteMovieIds?: string[];
    favoritePeople?: FavoritePerson[];
  };
  onSaved: () => void;
};

function OptionGrid<T extends { id: string; label: string; blurb?: string; category?: string; tier?: string }>({
  options,
  value,
  selectedIds,
  onChange,
  cols = "sm:grid-cols-2",
}: {
  options: T[];
  value?: string;
  selectedIds?: string[];
  onChange: (id: string) => void;
  cols?: string;
}) {
  const categories = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const o of options) {
      const c = o.category || "All";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(o);
    }
    return Array.from(map.entries());
  }, [options]);

  return (
    <div className="space-y-3">
      {categories.map(([cat, items]) => (
        <div key={cat}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mist/55">
            {cat}
          </p>
          <div className={`grid gap-2 ${cols}`}>
            {items.map((t: T) => {
              const on = selectedIds
                ? selectedIds.includes(t.id)
                : value === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    on
                      ? "border-teal bg-teal/15 text-white"
                      : "border-line text-mist hover:border-teal/40"
                  }`}
                >
                  <span className="font-semibold text-white">
                    {t.label}
                    {t.tier === "party" ? (
                      <span className="ml-1 text-[10px] font-medium text-amber">
                        Party
                      </span>
                    ) : null}
                  </span>
                  {t.blurb ? (
                    <span className="mt-0.5 block text-[11px] text-mist/70">
                      {t.blurb}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileCustomizePanel({ initial, onSaved }: Props) {
  const { state } = useWatchify();
  const plan = state.plan;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CosmeticTab>("page");
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [hue, setHue] = useState(initial.avatarHue);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl || "");
  const [theme, setTheme] = useState<ProfileThemeId>(
    initial.profileTheme || "classic"
  );
  const [border, setBorder] = useState<BorderStyleId>(
    initial.borderStyle || "soft"
  );
  const [accent, setAccent] = useState(initial.accentColor || "#2dd4bf");
  const [palette, setPalette] = useState<AccentPaletteId>(
    (initial.accentPalette as AccentPaletteId) || "teal"
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyleId>(
    initial.avatarStyle || "hue"
  );
  const [avatarFrame, setAvatarFrame] = useState<AvatarFrameId>(
    initial.avatarFrame || "soft-ring"
  );
  const [banner, setBanner] = useState<BannerStyleId>(
    initial.bannerStyle || "none"
  );
  const [pattern, setPattern] = useState<PatternOverlayId>(
    initial.patternOverlay || "none"
  );
  const [nameplate, setNameplate] = useState<NameplateStyleId>(
    initial.nameplateStyle || "classic"
  );
  const [badges, setBadges] = useState<ProfileBadgeId[]>(
    initial.profileBadgeIds || []
  );
  const [favorites, setFavorites] = useState<string[]>(
    initial.favoriteMovieIds || []
  );
  const [people, setPeople] = useState<FavoritePerson[]>(
    initial.favoritePeople || []
  );
  const [q, setQ] = useState("");
  const [peopleQ, setPeopleQ] = useState("");
  const [peopleHits, setPeopleHits] = useState<PersonCard[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(
    () => profileLooksCatalogStats({ includeParty: plan === "party" }),
    [plan]
  );

  const themes = useMemo(() => filterByPlan(PROFILE_THEMES, plan), [plan]);
  const borders = useMemo(() => filterByPlan(BORDER_STYLES, plan), [plan]);
  const avatarStyles = useMemo(() => filterByPlan(AVATAR_STYLES, plan), [plan]);
  const frames = useMemo(() => filterByPlan(AVATAR_FRAMES, plan), [plan]);
  const banners = useMemo(() => filterByPlan(BANNER_STYLES, plan), [plan]);
  const palettes = useMemo(() => filterByPlan(ACCENT_PALETTES, plan), [plan]);
  const patterns = useMemo(() => filterByPlan(PATTERN_OVERLAYS, plan), [plan]);
  const nameplates = useMemo(() => filterByPlan(NAMEPLATE_STYLES, plan), [plan]);
  const badgeOpts = useMemo(() => filterByPlan(PROFILE_BADGES, plan), [plan]);

  const picks = useMemo(() => {
    const pool = q.trim()
      ? searchMovies(q).slice(0, 12)
      : [...freeMovies(), ...CATALOG].slice(0, 16);
    return pool;
  }, [q]);

  useEffect(() => {
    const query = peopleQ.trim();
    if (query.length < 2) {
      setPeopleHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/catalog/people?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setPeopleHits((d.people || []).slice(0, 8)))
        .catch(() => setPeopleHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [peopleQ]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }

  function togglePerson(p: PersonCard) {
    setPeople((prev) => {
      if (prev.some((x) => x.id === p.id)) {
        return prev.filter((x) => x.id !== p.id);
      }
      if (prev.length >= 8) return prev;
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          department: p.department,
          profilePath: p.profilePath,
        },
      ];
    });
  }

  function toggleBadge(id: ProfileBadgeId) {
    setBadges((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          avatarHue: hue,
          avatarUrl:
            avatarStyle === "photo" ? avatarUrl.trim() || null : undefined,
          avatarStyle,
          avatarFrame,
          profileTheme: theme,
          borderStyle: border,
          accentColor: palette === "custom" ? accent : undefined,
          accentPalette: palette,
          bannerStyle: banner,
          patternOverlay: pattern,
          nameplateStyle: nameplate,
          profileBadgeIds: badges,
          favoriteMovieIds: favorites,
          favoritePeople: people,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Could not save");
        return;
      }
      setStatus("Profile updated");
      setOpen(false);
      onSaved();
    } catch {
      setStatus("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
      >
        Customize profile
      </button>
    );
  }

  const tabs: { id: CosmeticTab; label: string }[] = [
    { id: "page", label: "Page" },
    { id: "avatar", label: "Avatar" },
    { id: "banner", label: "Banner" },
    { id: "name", label: "Nameplate" },
    { id: "badges", label: "Badges" },
    { id: "shelf", label: "Shelf" },
  ];

  return (
    <form
      onSubmit={save}
      className="mt-4 space-y-4 rounded-2xl border border-line bg-ink/50 p-4 animate-fade-up"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold text-white">
            Customize your page
          </p>
          <p className="mt-0.5 text-[11px] text-mist/65">
            {stats.optionSlots}+ curated options ·{" "}
            {stats.uniqueLooks.toLocaleString()}+ unique looks (combinatorial)
            {plan === "party" ? " · Party exclusives unlocked" : " · Free set + Party exclusives"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-mist hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
              tab === t.id
                ? "bg-teal/20 text-teal-soft"
                : "border border-line text-mist hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "page" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-mist">
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-field mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-mist">
              Accent palette
              <select
                value={palette}
                onChange={(e) => {
                  const id = e.target.value as AccentPaletteId;
                  setPalette(id);
                  const meta = ACCENT_PALETTES.find((p) => p.id === id);
                  if (meta && id !== "custom") setAccent(meta.hex);
                }}
                className="auth-field mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
              >
                {palettes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.tier === "party" ? " (Party)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {palette === "custom" && (
            <label className="block text-xs text-mist">
              Custom accent
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-line bg-ink"
              />
            </label>
          )}
          <label className="block text-xs text-mist">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={280}
              className="auth-field mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
            />
          </label>
          <div>
            <p className="text-xs font-medium text-mist">Page template</p>
            <div className="mt-2">
              <OptionGrid
                options={themes}
                value={theme}
                onChange={(id) => {
                  setTheme(id);
                  const meta = PROFILE_THEMES.find((t) => t.id === id);
                  if (meta && palette !== "custom") {
                    setAccent(meta.defaultAccent);
                  }
                }}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-mist">Page frame</p>
            <div className="mt-2">
              <OptionGrid
                options={borders}
                value={border}
                onChange={setBorder}
                cols="grid-cols-2 sm:grid-cols-3"
              />
            </div>
          </div>
        </div>
      )}

      {tab === "avatar" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-mist">Avatar style</p>
            <div className="mt-2">
              <OptionGrid
                options={avatarStyles}
                value={avatarStyle}
                onChange={setAvatarStyle}
                cols="grid-cols-2 sm:grid-cols-3"
              />
            </div>
          </div>
          {avatarStyle === "photo" && (
            <label className="block text-xs text-mist">
              Photo URL (https)
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://… or leave blank"
                className="auth-field mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
              />
            </label>
          )}
          {avatarStyle === "hue" && (
            <label className="block text-xs text-mist">
              Avatar color
              <input
                type="range"
                min={0}
                max={359}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          )}
          <div>
            <p className="text-xs font-medium text-mist">Avatar frame</p>
            <div className="mt-2">
              <OptionGrid
                options={frames}
                value={avatarFrame}
                onChange={setAvatarFrame}
                cols="grid-cols-2 sm:grid-cols-3"
              />
            </div>
          </div>
        </div>
      )}

      {tab === "banner" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-mist">Banner</p>
            <div className="mt-2">
              <OptionGrid options={banners} value={banner} onChange={setBanner} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-mist">Pattern overlay</p>
            <div className="mt-2">
              <OptionGrid
                options={patterns}
                value={pattern}
                onChange={setPattern}
                cols="grid-cols-2 sm:grid-cols-3"
              />
            </div>
          </div>
        </div>
      )}

      {tab === "name" && (
        <div>
          <p className="text-xs font-medium text-mist">Nameplate style</p>
          <div className="mt-2">
            <OptionGrid
              options={nameplates}
              value={nameplate}
              onChange={setNameplate}
              cols="grid-cols-2 sm:grid-cols-3"
            />
          </div>
        </div>
      )}

      {tab === "badges" && (
        <div>
          <p className="text-xs font-medium text-mist">
            Profile badges ({badges.length}/3)
          </p>
          <div className="mt-2">
            <OptionGrid
              options={badgeOpts}
              selectedIds={badges}
              onChange={(id) => toggleBadge(id as ProfileBadgeId)}
              cols="grid-cols-2 sm:grid-cols-3"
            />
          </div>
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((id) => {
                const meta = PROFILE_BADGES.find((b) => b.id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleBadge(id)}
                    className="rounded-full border border-teal/40 bg-teal/15 px-3 py-1 text-xs text-white"
                  >
                    {meta?.label || id} ×
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-mist/60">
            Tap options to equip (max 3). Selected chips remove on click.
          </p>
        </div>
      )}

      {tab === "shelf" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-mist">
              Favorite movies ({favorites.length}/8)
            </p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles to add…"
              className="auth-field mt-2 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {picks.map((m: Movie) => {
                const on = favorites.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleFavorite(m.id)}
                    className={`rounded-xl border px-2.5 py-1.5 text-left text-xs ${
                      on
                        ? "border-teal/50 bg-teal/15 text-white"
                        : "border-line text-mist hover:border-teal/30"
                    }`}
                  >
                    <span className="line-clamp-1 max-w-[140px]">{m.title}</span>
                    <span className="mt-0.5 block text-[10px] text-mist/60">
                      {m.year}
                      {on ? " · selected" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-mist">
              Favorite actors & directors ({people.length}/8)
            </p>
            <input
              value={peopleQ}
              onChange={(e) => setPeopleQ(e.target.value)}
              placeholder="Search people (needs TMDB)…"
              className="auth-field mt-2 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
            />
            {people.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setPeople((prev) => prev.filter((x) => x.id !== p.id))
                    }
                    className="rounded-full border border-teal/40 bg-teal/15 px-3 py-1 text-xs text-white"
                  >
                    {p.name} ·{" "}
                    {p.department === "Directing" ? "Director" : "Actor"} ×
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {peopleHits.map((p) => {
                const on = people.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePerson(p)}
                    className={`rounded-xl border px-2.5 py-1.5 text-left text-xs ${
                      on
                        ? "border-teal/50 bg-teal/15 text-white"
                        : "border-line text-mist hover:border-teal/30"
                    }`}
                  >
                    {p.name}
                    <span className="mt-0.5 block text-[10px] text-mist/60">
                      {p.department}
                      {on ? " · selected" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {status && <p className="text-xs text-amber-soft">{status}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
