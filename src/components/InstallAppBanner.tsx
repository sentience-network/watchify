"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Soft prompt to install Watchify as an app (Chromium beforeinstallprompt).
 */
export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("watchify_install_dismissed")) return;
      if (window.matchMedia("(display-mode: standalone)").matches) return;
    } catch {
      /* ignore */
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden || !deferred) return null;

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
        Install Watchify
      </p>
      <p className="mt-1 text-xs text-mist/80">
        Add to your home screen for one-tap parties and living-room companion.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-1.5 text-xs text-mist hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
