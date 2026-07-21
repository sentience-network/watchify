"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { HeroPoster } from "@/lib/hero-posters";

type Props = {
  posters: HeroPoster[];
};

type SpiralSlot = {
  poster: HeroPoster;
  angle: number;
  radius: number;
  size: number;
  depth: number;
};

const GOLDEN_ANGLE = 137.5;

function buildSlots(posters: HeroPoster[]): SpiralSlot[] {
  const n = posters.length;
  if (n === 0) return [];

  return posters.map((poster, i) => {
    const t = i / Math.max(n - 1, 1);
    const angle = i * GOLDEN_ANGLE;
    // Wide Archimedean spiral — fills the viewport as a poster wall
    const radius = 28 + t * 340;
    const size = 110 + (1 - t) * 48;
    const depth = Math.round((1 - t) * 40);
    return { poster, angle, radius, size, depth };
  });
}

/**
 * Full-bleed spiral wall of movie posters for the landing hero.
 * Decorative only — aria-hidden, no focusables. Respects reduced motion.
 */
export function HeroPosterSpiral({ posters }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const slots = useMemo(() => buildSlots(posters), [posters]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (slots.length === 0) return null;

  return (
    <div
      className={`hero-spiral ${reduceMotion ? "hero-spiral--static" : ""}`}
      aria-hidden="true"
    >
      <div className="hero-spiral__glow" />
      <div className="hero-spiral__wheel">
        {slots.map((slot, i) => (
          <div
            key={slot.poster.id}
            className="hero-spiral__arm"
            style={
              {
                "--spiral-angle": `${slot.angle}deg`,
                "--spiral-radius": `${slot.radius}px`,
                "--spiral-size": `${slot.size}px`,
                "--spiral-z": slot.depth,
                "--spiral-delay": `${(i % 12) * 0.14}s`,
              } as CSSProperties
            }
          >
            <div className="hero-spiral__upright">
              <div className="hero-spiral__card">
                <Image
                  src={slot.poster.src}
                  alt=""
                  width={Math.round(slot.size)}
                  height={Math.round(slot.size * 1.5)}
                  className="hero-spiral__img"
                  sizes="(max-width: 768px) 96px, 160px"
                  priority={i < 12}
                  loading={i < 12 ? "eager" : "lazy"}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-spiral__veil" />
    </div>
  );
}
