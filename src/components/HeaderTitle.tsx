"use client";

import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

/** Current section label in the header, derived from the nav config. */
export function HeaderTitle({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";
  // Longest matching prefix wins so /admin/qr/[id] still shows "QR Codes".
  const match = items
    .filter((it) => pathname === it.href || pathname.startsWith(it.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return null;
  return (
    <span className="hidden text-sm font-semibold text-gray-900 md:inline">
      {match.label}
    </span>
  );
}
