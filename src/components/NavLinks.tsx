"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

export function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active =
          pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-light text-brand-dark"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
