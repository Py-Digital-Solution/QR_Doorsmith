"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

export function PromotionalBanner({
  banner,
}: {
  banner?: { image: string; enabled: boolean } | null;
}) {
  const [showBanner, setShowBanner] = useState(false);
  const bannerKey = banner?.image
    ? `promo_banner_session_${banner.image.length}_${banner.image.slice(-16)}`
    : null;

  useEffect(() => {
    if (!bannerKey || !banner?.enabled || !banner?.image) {
      setShowBanner(false);
      return;
    }
    // Clean up legacy localStorage keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("promo_banner_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    // Check sessionStorage (shows on every new session)
    try {
      const dismissed = sessionStorage.getItem(bannerKey);
      setShowBanner(!dismissed);
    } catch {
      setShowBanner(true);
    }
  }, [bannerKey, banner?.enabled, banner?.image]);

  const dismissBanner = useCallback(() => {
    if (bannerKey) {
      try {
        sessionStorage.setItem(bannerKey, "1");
      } catch {}
    }
    setShowBanner(false);
  }, [bannerKey]);

  // Handle escape key to dismiss popup
  useEffect(() => {
    if (!showBanner) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissBanner();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBanner, dismissBanner]);

  if (!showBanner || !banner?.image || !banner?.enabled) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissBanner();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[90vh] max-w-lg w-full overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20 sm:max-w-xl md:max-w-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={dismissBanner}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black hover:scale-110 active:scale-95 focus:outline-none"
          aria-label="Close announcement"
          title="Close announcement"
        >
          <X className="size-5" strokeWidth={2.5} aria-hidden />
        </button>

        {/* Banner image with contained aspect ratio */}
        <div className="flex items-center justify-center bg-black/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image}
            alt="Promotional Announcement"
            className="max-h-[82vh] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
