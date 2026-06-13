"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    if (sessionStorage.getItem("pwa-dismissed")) { setDismissed(true); return; }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "dismissed") { sessionStorage.setItem("pwa-dismissed", "1"); }
    setPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  if (isStandalone || dismissed) return null;

  // ── Chrome/Android/Desktop install prompt ──
  if (prompt) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-light p-3 shadow-card">
        <Image src="/icons/icon-192.png" alt="Khati app icon" width={44} height={44} className="shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Install Khati App</p>
          <p className="text-xs text-gray-500">Add to home screen for quick access</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={dismiss} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-100">Not now</button>
          <button onClick={install} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">Install</button>
        </div>
      </div>
    );
  }

  // ── iOS Safari — show manual steps immediately ──
  if (isIOS) {
    return (
      <div className="mb-5 rounded-xl border border-brand/20 bg-brand-light p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-192.png" alt="Khati app icon" width={32} height={32} className="shrink-0 rounded-lg" />
            <p className="text-sm font-semibold text-gray-900">Add to Home Screen</p>
          </div>
          <button onClick={dismiss} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <ol className="space-y-2">
          {[
            { icon: "⬆️", text: 'Tap the Share button at the bottom of Safari' },
            { icon: "➕", text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: "✅", text: 'Tap "Add" in the top right' },
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="shrink-0">{s.icon}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return null;
}
