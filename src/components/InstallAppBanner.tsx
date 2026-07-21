"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notChrome;
}

function isStandalone() {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    );
  } catch {
    return false;
  }
}

/**
 * Soft prompt to install Watchify:
 * - Chromium: beforeinstallprompt
 * - iOS Safari: Share → Add to Home Screen guide
 */
export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [iosGuide, setIosGuide] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("watchify_install_dismissed")) return;
      if (isStandalone()) return;
    } catch {
      /* ignore */
    }

    if (isIosSafari()) {
      setIosGuide(true);
      setHidden(false);
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;
  if (!deferred && !iosGuide) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
    if (choice.outcome === "dismissed") {
      try {
        localStorage.setItem("watchify_install_dismissed", "1");
      } catch {
        /* ignore */
      }
    }
  }

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem("watchify_install_dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed bottom-[148px] left-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 rounded-2xl border border-teal/40 bg-ink/95 p-3 shadow-xl backdrop-blur md:bottom-28">
      <p className="font-display text-sm font-semibold text-white">
        {iosGuide ? "Add Watchify to Home Screen" : "Install Watchify"}
      </p>
      {iosGuide ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-mist/85">
          <li>
            Tap the <span className="text-white">Share</span> button in Safari
            (square with ↑).
          </li>
          <li>
            Scroll and tap{" "}
            <span className="text-white">Add to Home Screen</span>.
          </li>
          <li>
            Tap <span className="text-white">Add</span> — open Watchify like an
            app for one-tap parties.
          </li>
        </ol>
      ) : (
        <p className="mt-1 text-xs text-mist/80">
          Add to your home screen for one-tap parties and living-room companion.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        {deferred ? (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          {iosGuide ? "Got it" : "Not now"}
        </button>
      </div>
    </div>
  );
}
