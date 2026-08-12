"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/**
 * Install / "Add to Home Screen" prompt. Always shown (until installed or
 * dismissed) so it stays visible even on older phones whose browsers never fire
 * `beforeinstallprompt`. When the native prompt is available we use it (one
 * tap); otherwise we show platform-appropriate manual steps.
 */
export function PwaInstallBanner({ appName = "Gati Growth Labs", logoUrl }: { appName?: string; logoUrl?: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("other");
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const iconSrc = logoUrl && logoUrl !== "/logo.png" ? logoUrl : "/logo.svg";

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    if (sessionStorage.getItem("pwa-dismissed")) { setDismissed(true); return; }

    setPlatform(detectPlatform());

    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    // Native install available → use it. Otherwise reveal manual steps.
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "dismissed") sessionStorage.setItem("pwa-dismissed", "1");
      setPrompt(null);
      return;
    }
    setShowSteps((v) => !v);
  }

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  if (isStandalone || dismissed) return null;

  const steps =
    platform === "ios"
      ? [
          { icon: "⬆️", text: "Tap the Share button at the bottom of Safari" },
          { icon: "➕", text: 'Scroll down and tap "Add to Home Screen"' },
          { icon: "✅", text: 'Tap "Add" in the top right' },
        ]
      : [
          { icon: "⋮", text: "Open your browser menu (top-right)" },
          { icon: "➕", text: 'Tap "Install app" or "Add to Home screen"' },
          { icon: "✅", text: `Confirm to add ${appName} to your home screen` },
        ];

  // iOS never fires beforeinstallprompt, so show its steps inline by default.
  const stepsOpen = showSteps || (platform === "ios" && !prompt);
  const hasImageLogo = logoUrl && logoUrl !== "/logo.png" && (logoUrl.startsWith("data:") || logoUrl.startsWith("http") || logoUrl.startsWith("/"));

  return (
    <div className="mb-5 rounded-xl border border-brand/20 bg-brand-light p-3 shadow-card">
      <div className="flex items-center gap-3">
        {hasImageLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${appName} app icon`} className="size-11 shrink-0 rounded-xl object-contain" />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-white shadow-sm select-none">
            {appName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Install {appName} App</p>
          <p className="text-xs text-gray-500">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={dismiss} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-100">Not now</button>
        {/* Hide the redundant button on iOS where steps are already shown. */}
        {!(platform === "ios" && !prompt) && (
          <button onClick={install} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
            {prompt ? "Install" : showSteps ? "Hide" : "How to install"}
          </button>
        )}
      </div>

      {stepsOpen && (
        <ol className="mt-3 space-y-2 border-t border-brand/15 pt-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="shrink-0">{s.icon}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
