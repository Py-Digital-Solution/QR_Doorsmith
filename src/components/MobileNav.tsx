"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutStaff } from "@/actions/auth";
import { MoreHorizontal, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { ICONS } from "./ui/icons";
import { Avatar } from "./Avatar";
import type { NavItem } from "@/lib/nav";
import type { UserRole } from "@/lib/roles";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales_rep: "Sales Rep",
  distributor: "Distributor",
  counter: "Counter",
  khati: "Khati",
};

/** Max primary tabs shown in the bottom bar; the rest move into "More". */
const MAX_TABS = 4;

/**
 * Mobile bottom navigation for staff roles — same pattern as the Khati app:
 * a fixed bottom tab bar (first few nav items) plus a "More" bottom sheet that
 * holds the overflow nav items and account actions (Profile / Settings / Sign out).
 */
export function MobileNav({
  items,
  user,
}: {
  items: NavItem[];
  user: { name?: string; email?: string; role: UserRole };
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const close = () => setMoreOpen(false);
  const label = user.name || user.email || "Account";

  const tabs = items.slice(0, MAX_TABS);
  const overflow = items.slice(MAX_TABS);

  // Lock body scroll while the More sheet is open.
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  return (
    <>
      {/* ── Bottom tab bar ── */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="flex">
          {tabs.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            const Icon = ICONS[it.icon];
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-3 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" />}
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {it.label}
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="flex flex-1 flex-col items-center gap-1 pt-2.5 pb-3 text-[10px] font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            <MoreHorizontal className="size-[22px]" aria-hidden />
            More
          </button>
        </div>
      </nav>

      {/* ── More bottom sheet (portaled to body to escape the header's backdrop-filter) ── */}
      {moreOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[2px]" onClick={close} />

          <div className="relative rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-overlay">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* User identity */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <Avatar name={user.name || user.email} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{label}</p>
                <span className="mt-0.5 inline-flex items-center rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto py-2">
              {/* Overflow nav items */}
              {overflow.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = ICONS[it.icon];
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={close}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-gray-50"
                  >
                    <Icon className={`size-5 ${active ? "text-brand" : "text-gray-400"}`} aria-hidden />
                    <span className={`flex-1 font-medium ${active ? "text-brand-dark" : "text-gray-900"}`}>{it.label}</span>
                    <ChevronRight className="size-4 text-gray-300" aria-hidden />
                  </Link>
                );
              })}

              {overflow.length > 0 && <div className="mx-5 my-1 border-t border-gray-100" />}

              {/* Account actions */}
              <Link
                href="/profile"
                onClick={close}
                className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-gray-50"
              >
                <User className="size-5 text-gray-400" aria-hidden />
                <span className="flex-1 font-medium text-gray-900">Profile</span>
                <ChevronRight className="size-4 text-gray-300" aria-hidden />
              </Link>

              {user.role === "admin" && (
                <Link
                  href="/admin/settings"
                  onClick={close}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-gray-50"
                >
                  <Settings className="size-5 text-gray-400" aria-hidden />
                  <span className="flex-1 font-medium text-gray-900">Settings</span>
                  <ChevronRight className="size-4 text-gray-300" aria-hidden />
                </Link>
              )}

              <div className="mx-5 my-1 border-t border-gray-100" />

              <form action={signOutStaff}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  <LogOut className="size-5" aria-hidden />
                  <span className="font-medium">Sign Out</span>
                </button>
              </form>
            </div>
            <div className="pb-4" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
