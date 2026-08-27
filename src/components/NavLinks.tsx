"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { ICONS } from "./ui/icons";

function isNavActive(pathname: string, itemHref: string, allItems: NavItem[]): boolean {
  if (pathname === itemHref) return true;
  if (!pathname.startsWith(itemHref + "/")) return false;
  // If another item matches more specifically (longer href), this item is not the active one
  const betterMatch = allItems.some(
    (other) =>
      other.href !== itemHref &&
      other.href.length > itemHref.length &&
      (pathname === other.href || pathname.startsWith(other.href + "/")),
  );
  return !betterMatch;
}

export function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = isNavActive(pathname, it.href, items);
        const Icon = ICONS[it.icon];
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`focus-ring group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-light text-brand-dark"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" />
            )}
            <Icon
              className={`size-4.5 shrink-0 transition-colors ${
                active ? "text-brand" : "text-gray-400 group-hover:text-gray-600"
              }`}
              aria-hidden
            />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
