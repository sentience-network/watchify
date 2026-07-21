"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

type Props = {
  name: string;
  hue: number;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ringColor?: string;
  /** Cosmetic frame id from profile cosmetics */
  frame?: string | null;
};

const SIZE = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function ProfileAvatar({
  name,
  hue,
  avatarUrl,
  size = "md",
  className = "",
  ringColor,
  frame,
}: Props) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  const showImg = Boolean(avatarUrl) && !broken;
  const frameId = frame || "soft-ring";
  const useCssFrame = frameId !== "soft-ring" && frameId !== "none";

  return (
    <div
      className={`avatar-frame avatar-frame-${frameId} ${className}`}
      style={
        {
          "--profile-accent": ringColor || "#2dd4bf",
        } as CSSProperties
      }
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${SIZE[size]}`}
        style={{
          background: showImg ? "#0b1210" : `hsl(${hue} 72% 48%)`,
          boxShadow:
            !useCssFrame && frameId === "soft-ring" && ringColor
              ? `0 0 0 3px ${ringColor}55, 0 0 24px ${ringColor}33`
              : undefined,
        }}
      >
        {showImg ? (
          <Image
            src={avatarUrl!}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
            unoptimized
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display font-bold text-white">
            {initials || "?"}
          </span>
        )}
      </div>
    </div>
  );
}
