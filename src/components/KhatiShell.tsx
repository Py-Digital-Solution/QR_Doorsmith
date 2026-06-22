"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOutKhati } from "@/actions/auth";
import {
  Home,
  ScanLine,
  History,
  Gift,
  MoreHorizontal,
  User,
  LifeBuoy,
  Info,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Download,
  Share,
  SquarePlus,
  CircleCheck,
  Phone,
  Mail,
  PlayCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";
import { NAV } from "@/lib/nav";
import type { UserRole } from "@/lib/roles";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Bottom tabs ──────────────────────────────────────────────────────────────

const TABS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/khati", label: "Home", Icon: Home },
  { href: "/khati/scan", label: "Scan", Icon: ScanLine },
  { href: "/khati/history", label: "History", Icon: History },
  { href: "/khati/redemptions", label: "Redeem", Icon: Gift },
];

// ─── Shell ────────────────────────────────────────────────────────────────────

export function KhatiShell({
  user,
  children,
  banner,
}: {
  user: { name?: string; email?: string; role: UserRole };
  children: ReactNode;
  banner?: { image: string; enabled: boolean } | null;
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"help" | "about" | "ios-install" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const bannerKey = banner?.image
    ? `khati_banner_${banner.image.length}_${banner.image.slice(-12)}`
    : null;

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!bannerKey) { setShowBanner(false); return; }
    const dismissed = localStorage.getItem(bannerKey);
    setShowBanner(!dismissed);
  }, [bannerKey]);

  function dismissBanner() {
    if (bannerKey) localStorage.setItem(bannerKey, "1");
    setShowBanner(false);
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  }

  function closeMore() {
    setMoreOpen(false);
    setSubPanel(null);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">

      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────── */}
      <Sidebar items={NAV.khati} className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Desktop header (hidden on mobile) ──────────────────────────── */}
        <header className="z-30 hidden h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 md:flex">
          <div className="ml-auto flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </header>

        {/* ── Mobile header (hidden on desktop) ──────────────────────────── */}
        <header className="z-40 flex h-14 shrink-0 items-center border-b border-gray-100 bg-white/95 px-4 shadow-card backdrop-blur-sm md:hidden">
          <Image src="/logo.png" alt="DoorSmith" width={110} height={18} className="h-5 w-auto" />
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        {/* pb-24 on mobile gives room for the fixed bottom nav */}
        <main className="flex-1 overflow-y-auto">
          {/* Promotional banner  floats at top of content, dismissible per-device */}
          {showBanner && banner?.image && (
            <div className="sticky top-0 z-20 w-full">
              <div className="relative overflow-hidden shadow-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image}
                  alt="Announcement"
                  className="max-h-52 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Dismiss banner"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-6 md:pb-6 lg:p-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom navigation (hidden on desktop) ───────────────── */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="flex">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-3 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" />
                )}
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 pt-2.5 pb-3 text-[10px] font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            <MoreHorizontal className="size-[22px]" aria-hidden />
            More
          </button>
        </div>
      </nav>

      {/* ── More bottom sheet (mobile only) ────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div
            className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[2px]"
            onClick={closeMore}
          />

          <div className="relative rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-overlay">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {subPanel === null && (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white shadow-card">
                    {user.name?.[0]?.toUpperCase() ?? "K"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name ?? "Khati"}</p>
                    <p className="text-xs text-gray-400">Carpenter</p>
                  </div>
                </div>

                <div className="py-2">
                  <Link href="/khati/products" onClick={closeMore}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <PlayCircle className="size-5 text-brand" aria-hidden />
                    <span className="flex-1 font-medium text-gray-900">Product Tutorials</span>
                    <ChevronRight className="size-4 text-gray-300" aria-hidden />
                  </Link>

                  <Link href="/profile" onClick={closeMore}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <User className="size-5 text-gray-400" aria-hidden />
                    <span className="flex-1 font-medium">Profile &amp; Settings</span>
                    <ChevronRight className="size-4 text-gray-300" aria-hidden />
                  </Link>

                  <button onClick={() => setSubPanel("help")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <LifeBuoy className="size-5 text-gray-400" aria-hidden />
                    <span className="flex-1 text-left font-medium">Help &amp; Support</span>
                    <ChevronRight className="size-4 text-gray-300" aria-hidden />
                  </button>

                  <button onClick={() => setSubPanel("about")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <Info className="size-5 text-gray-400" aria-hidden />
                    <span className="flex-1 text-left font-medium">About App</span>
                    <ChevronRight className="size-4 text-gray-300" aria-hidden />
                  </button>

                  {!isStandalone && installPrompt && (
                    <button onClick={installApp}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-brand transition-colors hover:bg-brand-light">
                      <Download className="size-5" aria-hidden />
                      <span className="flex-1 text-left font-semibold">Install App</span>
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                    </button>
                  )}

                  {!isStandalone && isIOS && (
                    <button onClick={() => setSubPanel("ios-install")}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-brand transition-colors hover:bg-brand-light">
                      <Download className="size-5" aria-hidden />
                      <span className="flex-1 text-left font-semibold">Add to Home Screen</span>
                      <ChevronRight className="size-4 text-gray-300" aria-hidden />
                    </button>
                  )}

                  <div className="mx-5 my-1 border-t border-gray-100" />

                  <form action={signOutKhati}>
                    <button type="submit"
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-red-500 transition-colors hover:bg-red-50">
                      <LogOut className="size-5" aria-hidden />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </form>
                </div>
                <div className="pb-6" />
              </>
            )}

            {subPanel === "help" && (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => setSubPanel(null)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">Help &amp; Support</h2>
                </div>
                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-xl bg-brand-light p-4">
                    <p className="text-xs font-semibold tracking-wide text-brand uppercase">Contact Us</p>
                    <p className="mt-2 text-sm text-gray-600">Having trouble? Reach out to your counter supervisor or contact LR Enterprises support.</p>
                  </div>
                  <div className="space-y-3">
                    <a href="tel:+911234567890" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 shadow-card transition-shadow hover:shadow-card-hover">
                      <Phone className="size-[18px] shrink-0 text-brand" aria-hidden />
                      <div>
                        <p className="font-medium">Call Support</p>
                        <p className="text-xs text-gray-400">+91 12345 67890</p>
                      </div>
                    </a>
                    <a href="mailto:support@lrenterpises.com" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 shadow-card transition-shadow hover:shadow-card-hover">
                      <Mail className="size-[18px] shrink-0 text-brand" aria-hidden />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-xs text-gray-400">support@lrenterpises.com</p>
                      </div>
                    </a>
                  </div>
                  <p className="text-center text-xs text-gray-400">Mon – Sat · 9 AM – 6 PM</p>
                </div>
                <div className="pb-6" />
              </>
            )}

            {subPanel === "about" && (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => setSubPanel(null)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">About App</h2>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Image src="/logo.png" alt="DoorSmith" width={140} height={23} className="h-7 w-auto" />
                    <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">Khati Rewards</span>
                  </div>
                  <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Version</span>
                      <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">By</span>
                      <span className="font-medium">LR Enterprises</span>
                    </div>
                  </div>
                  <p className="text-center text-xs leading-relaxed text-gray-400">
                    Scan product QR codes to earn reward points. Redeem your points through your counter supervisor.
                  </p>
                </div>
                <div className="pb-6" />
              </>
            )}

            {/* ── iOS Add to Home Screen instructions ── */}
            {subPanel === "ios-install" && (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => setSubPanel(null)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">Add to Home Screen</h2>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="text-sm text-gray-500">
                    Install this app on your iPhone for quick access  no App Store needed.
                  </p>

                  {[
                    {
                      step: "1",
                      Icon: Share,
                      text: "Tap the Share button at the bottom of Safari",
                      sub: "It looks like a box with an arrow pointing up",
                    },
                    {
                      step: "2",
                      Icon: SquarePlus,
                      text: 'Scroll down and tap "Add to Home Screen"',
                      sub: "You may need to scroll the share sheet to find it",
                    },
                    {
                      step: "3",
                      Icon: CircleCheck,
                      text: 'Tap "Add" in the top right corner',
                      sub: "The app icon will appear on your home screen",
                    },
                  ].map(({ step, Icon, text, sub }) => (
                    <div key={step} className="flex gap-3 rounded-xl bg-gray-50 p-3">
                      <Icon className="mt-0.5 size-[22px] shrink-0 text-brand" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{text}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pb-6" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
