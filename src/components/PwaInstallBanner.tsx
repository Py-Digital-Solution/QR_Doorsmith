"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Captures the browser's beforeinstallprompt event and renders an
 * install banner. Returns null until the prompt is available or after
 * the user has already installed or dismissed.
 */
export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pwa-dismissed");
    if (stored) { setDismissed(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "dismissed") {
      sessionStorage.setItem("pwa-dismissed", "1");
    }
    setPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  if (!prompt || dismissed) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
      <Image
        src="/icons/icon-192.png"
        alt="Khati app icon"
        width={44}
        height={44}
        className="shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Install Khati App</p>
        <p className="text-xs text-gray-500">Add to home screen for quick access</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={dismiss}
          className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-100"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Install
        </button>
      </div>
    </div>
  );
}
