/**
 * Optional party sound cues (Web Audio). Off by default.
 * Respects notify prefs "muted" and a dedicated local toggle.
 */

import { loadNotifyPrefs } from "./notify-prefs";

const KEY = "watchify_party_sounds_v1";

export type PartySoundKind = "join" | "reaction" | "countdown";

export function partySoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (loadNotifyPrefs().mode === "muted") return false;
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPartySoundsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* quota */
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.04
) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);
  const now = audio.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

/** Soft join chime / reaction pop / countdown tick. */
export function playPartySound(kind: PartySoundKind) {
  if (!partySoundsEnabled()) return;
  try {
    if (kind === "join") {
      tone(523, 90);
      window.setTimeout(() => tone(784, 120), 80);
    } else if (kind === "reaction") {
      tone(660, 70, "triangle", 0.035);
    } else {
      tone(440, 55, "square", 0.03);
    }
  } catch {
    /* autoplay / audio blocked */
  }
}
