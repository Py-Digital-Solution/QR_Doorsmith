"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PromotionalBanner({
  banner,
}: {
  banner?: { image: string; enabled: boolean } | null;
}) {
  const [showBanner, setShowBanner] = useState(false);
  const bannerKey = banner?.image
    ? `promo_banner_session_${banner.image.length}_${banner.image.slice(-12)}`
    : null;

  useEffect(() => {
    if (!bannerKey || !banner?.enabled || !banner?.image) {
      setShowBanner(false);
      return;
    }
    // Clean up any legacy localStorage keys to ensure new sessions always show banner
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("promo_banner_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    // Check sessionStorage (resets on every new login session / tab restart)
    try {
      const dismissed = sessionStorage.getItem(bannerKey);
      setShowBanner(!dismissed);
    } catch {
      setShowBanner(true);
    }
  }, [bannerKey, banner?.enabled, banner?.image]);

  function dismissBanner() {
    if (bannerKey) {
      try {
        sessionStorage.setItem(bannerKey, "1");
      } catch {}
    }
    setShowBanner(false);
  }

  if (!showBanner || !banner?.image || !banner?.enabled) return null;

  return (
    <div className="sticky top-0 z-20 w-full animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative overflow-hidden bg-gray-900 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.image}
          alt="Promotional Announcement"
          className="max-h-60 w-full object-cover sm:max-h-72"
        />
        <button
          type="button"
          onClick={dismissBanner}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105"
          aria-label="Close announcement"
          title="Close announcement"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
