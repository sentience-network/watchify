"use client";

import { useEffect, useRef, useState } from "react";
import {
  SHARE_PLATFORMS,
  copyToClipboard,
  directShareHref,
  nativeShare,
  type SharePlatformId,
} from "@/lib/share";

type Props = {
  url: string;
  title: string;
  text: string;
  compact?: boolean;
  /** e.g. flip watchingPublic on before sharing presence */
  onBeforeShare?: () => void;
  /** Fired after a successful copy / native share / platform open */
  onShared?: () => void;
};

export function ShareMenu({ url, title, text, compact, onBeforeShare, onShared }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function prepareShare() {
    onBeforeShare?.();
  }

  function noteShared() {
    onShared?.();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function flashCopied(message: string) {
    setCopied(true);
    setStatus(message);
    setTimeout(() => {
      setCopied(false);
      setStatus(null);
    }, 2200);
  }

  async function onCopy() {
    prepareShare();
    const ok = await copyToClipboard(url);
    if (ok) {
      await flashCopied("Link copied");
      noteShared();
    } else setStatus("Could not copy — select and copy manually");
  }

  async function onNative() {
    prepareShare();
    const result = await nativeShare({ title, text, url });
    if (result === "shared") {
      setStatus("Shared");
      setOpen(false);
      noteShared();
      return;
    }
    if (result === "unavailable") {
      setHint(
        "This browser has no native share sheet — use a platform below or copy the link."
      );
      setOpen(true);
      return;
    }
    // cancelled — do not claim success
    setStatus(null);
  }

  async function onPlatform(id: SharePlatformId) {
    prepareShare();
    const platform = SHARE_PLATFORMS.find((p) => p.id === id);
    if (!platform) return;

    if (id === "copy") {
      await onCopy();
      return;
    }
    if (id === "native") {
      await onNative();
      return;
    }

    if (platform.kind === "copy_then_open") {
      const ok = await copyToClipboard(url);
      setHint(platform.honesty || null);
      if (ok) {
        await flashCopied(`Link copied — open ${platform.label} to paste`);
        noteShared();
      } else {
        setStatus("Copy failed — copy the URL manually, then open the app");
      }
      const href = directShareHref(id, { url, title, text });
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    const href = directShareHref(id, { url, title, text });
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      setOpen(false);
      noteShared();
    }
  }

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          prepareShare();
          setOpen((v) => !v);
        }}
        className={
          compact
            ? "rounded-md border border-line px-2.5 py-1 text-xs text-mist hover:border-teal/50 hover:text-teal-soft"
            : "rounded-lg border border-line bg-panel/70 px-3 py-2 text-sm text-mist transition hover:border-teal/40 hover:text-teal-soft"
        }
      >
        Share
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 animate-fade-up rounded-xl border border-line bg-panel p-2 shadow-glow">
          <p className="px-2 pb-1 pt-1 text-[11px] uppercase tracking-[0.14em] text-mist/70">
            Share on Watchify
          </p>
          <div className="max-h-72 overflow-y-auto">
            {SHARE_PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void onPlatform(p.id)}
                className="flex w-full flex-col items-start rounded-lg px-2 py-2 text-left hover:bg-white/5"
              >
                <span className="text-sm text-mist hover:text-white">
                  {p.id === "copy" && copied ? "Link copied" : p.label}
                </span>
                {p.honesty && (
                  <span className="mt-0.5 text-[10px] leading-snug text-mist/55">
                    {p.kind === "copy_then_open"
                      ? "Copy link + open app"
                      : p.honesty.slice(0, 48)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {hint && (
            <p className="mt-1 border-t border-line px-2 pt-2 text-[11px] leading-relaxed text-amber-soft/90">
              {hint}
            </p>
          )}
          {status && (
            <p className="px-2 pt-1 text-[11px] text-teal-soft" role="status">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
