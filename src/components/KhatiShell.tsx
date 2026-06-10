"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";
import { NAV } from "@/lib/nav";
import type { UserRole } from "@/lib/roles";

// ─── Mobile bottom-nav icons ──────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function IconScan({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V6a1 1 0 011-1h3M15 5h3a1 1 0 011 1v3M21 15v3a1 1 0 01-1 1h-3M9 19H6a1 1 0 01-1-1v-3" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function IconClock({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.5 5a.5.5 0 00-1 0v5.5l3.5 2.1a.5.5 0 00.5-.866L12.5 12V7z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

function IconGift({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,12 20,22 4,22 4,12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

// ─── More-sheet icons ─────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Bottom tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { href: "/khati", label: "Home", icon: "home" },
  { href: "/khati/scan", label: "Scan", icon: "scan" },
  { href: "/khati/history", label: "History", icon: "history" },
  { href: "/khati/redemptions", label: "Redeem", icon: "gift" },
] as const;

// ─── Shell ────────────────────────────────────────────────────────────────────

export function KhatiShell({
  user,
  children,
}: {
  user: { name?: string; email?: string; role: UserRole };
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"help" | "about" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true,
    );
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────── */}
      <Sidebar items={NAV.khati} className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Desktop header (hidden on mobile) ──────────────────────────── */}
        <header className="hidden h-16 items-center gap-2 border-b border-gray-200 bg-white px-4 sm:px-6 md:flex">
          <div className="ml-auto flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </header>

        {/* ── Mobile header (hidden on desktop) ──────────────────────────── */}
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-gray-100 bg-white px-4 shadow-sm md:hidden">
          <Image src="/logo.png" alt="DoorSmith" width={110} height={18} className="h-5 w-auto" />
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        {/* pb-24 on mobile gives room for the fixed bottom nav */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* ── Mobile bottom navigation (hidden on desktop) ───────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-gray-400"
                }`}
              >
                {tab.icon === "home" && <IconHome active={active} />}
                {tab.icon === "scan" && <IconScan active={active} />}
                {tab.icon === "history" && <IconClock active={active} />}
                {tab.icon === "gift" && <IconGift active={active} />}
                {tab.label}
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 text-[10px] font-medium text-gray-400 transition-colors"
          >
            <IconMore />
            More
          </button>
        </div>
      </nav>

      {/* ── More bottom sheet (mobile only) ────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeMore} />

          <div className="relative rounded-t-2xl bg-white shadow-2xl">
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {subPanel === null && (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                    {user.name?.[0]?.toUpperCase() ?? "K"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name ?? "Khati"}</p>
                    <p className="text-xs text-gray-400">Carpenter</p>
                  </div>
                </div>

                <div className="py-2">
                  <Link href="/profile" onClick={closeMore}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50">
                    <span className="text-gray-400"><IconUser /></span>
                    <span className="flex-1 font-medium">Profile &amp; Settings</span>
                    <span className="text-gray-300"><IconChevron /></span>
                  </Link>

                  <button onClick={() => setSubPanel("help")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50">
                    <span className="text-gray-400"><IconHelp /></span>
                    <span className="flex-1 text-left font-medium">Help &amp; Support</span>
                    <span className="text-gray-300"><IconChevron /></span>
                  </button>

                  <button onClick={() => setSubPanel("about")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50">
                    <span className="text-gray-400"><IconInfo /></span>
                    <span className="flex-1 text-left font-medium">About App</span>
                    <span className="text-gray-300"><IconChevron /></span>
                  </button>

                  {!isStandalone && installPrompt && (
                    <button onClick={installApp}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-brand hover:bg-orange-50">
                      <IconDownload />
                      <span className="flex-1 text-left font-semibold">Install App</span>
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                    </button>
                  )}

                  <div className="mx-5 my-1 border-t border-gray-100" />

                  <button onClick={() => signOut({ callbackUrl: "/login/khati" })}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-red-500 hover:bg-red-50">
                    <IconLogout />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
                <div className="pb-8" />
              </>
            )}

            {subPanel === "help" && (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => setSubPanel(null)} className="p-1 text-gray-400 hover:text-gray-700">
                    <IconBack />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">Help &amp; Support</h2>
                </div>
                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">Contact Us</p>
                    <p className="mt-2 text-sm text-gray-600">Having trouble? Reach out to your counter supervisor or contact LR Enterprises support.</p>
                  </div>
                  <div className="space-y-3">
                    <a href="tel:+911234567890" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18H5a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
                      </svg>
                      <div>
                        <p className="font-medium">Call Support</p>
                        <p className="text-xs text-gray-400">+91 12345 67890</p>
                      </div>
                    </a>
                    <a href="mailto:support@lrenterpises.com" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-xs text-gray-400">support@lrenterpises.com</p>
                      </div>
                    </a>
                  </div>
                  <p className="text-center text-xs text-gray-400">Mon – Sat · 9 AM – 6 PM</p>
                </div>
                <div className="pb-8" />
              </>
            )}

            {subPanel === "about" && (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => setSubPanel(null)} className="p-1 text-gray-400 hover:text-gray-700">
                    <IconBack />
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
                <div className="pb-8" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
