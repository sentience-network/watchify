"use client";

import { FormEvent, useMemo, useState } from "react";
import { CATALOG, freeMovies, searchMovies } from "@/lib/movies";
import {
  BORDER_STYLES,
  PROFILE_THEMES,
  type BorderStyleId,
  type ProfileThemeId,
} from "@/lib/profile-themes";
import type { Movie } from "@/lib/types";

type Props = {
  initial: {
    name: string;
    bio: string;
    avatarHue: number;
    avatarUrl?: string | null;
    profileTheme?: string;
    borderStyle?: string;
    accentColor?: string;
    favoriteMovieIds?: string[];
  };
  onSaved: () => void;
};

export function ProfileCustomizePanel({ initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [hue, setHue] = useState(initial.avatarHue);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl || "");
  const [theme, setTheme] = useState<ProfileThemeId>(
    (initial.profileTheme as ProfileThemeId) || "classic"
  );
  const [border, setBorder] = useState<BorderStyleId>(
    (initial.borderStyle as BorderStyleId) || "soft"
  );
  const [accent, setAccent] = useState(initial.accentColor || "#2dd4bf");
  const [favorites, setFavorites] = useState<string[]>(
    initial.favoriteMovieIds || []
  );
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const picks = useMemo(() => {
    const pool = q.trim()
      ? searchMovies(q).slice(0, 12)
      : [...freeMovies(), ...CATALOG].slice(0, 16);
    return pool;
  }, [q]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
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
          avatarUrl: avatarUrl.trim() || null,
          profileTheme: theme,
          borderStyle: border,
          accentColor: accent,
          favoriteMovieIds: favorites,
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

  async function useGeneratedAvatar() {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useDicebearAvatar: true }),
      });
      if (!res.ok) {
        setStatus("Could not generate avatar");
        return;
      }
      setStatus("Avatar generated");
      onSaved();
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

  return (
    <form
      onSubmit={save}
      className="mt-4 space-y-5 rounded-2xl border border-line bg-ink/50 p-4 animate-fade-up"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold text-white">
          Customize your page
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-mist hover:text-white"
        >
          Close
        </button>
      </div>

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
          Accent color
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-line bg-ink"
          />
        </label>
      </div>

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
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PROFILE_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id);
                setAccent(t.defaultAccent);
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                theme === t.id
                  ? "border-teal bg-teal/15 text-white"
                  : "border-line text-mist hover:border-teal/40"
              }`}
            >
              <span className="font-semibold text-white">{t.label}</span>
              <span className="mt-0.5 block text-[11px] text-mist/70">
                {t.blurb}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-mist">Border style</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BORDER_STYLES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBorder(b.id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                border === b.id
                  ? "bg-teal/20 text-teal-soft"
                  : "border border-line text-mist"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-mist">
          Avatar color (when no photo)
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-xs text-mist">
          Photo URL (https)
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://… or leave blank"
            className="auth-field mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void useGeneratedAvatar()}
        className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
      >
        Generate cartoon avatar
      </button>

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
