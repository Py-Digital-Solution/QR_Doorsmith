"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "@/lib/nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="focus-ring rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 left-0 flex h-full w-64 flex-col bg-white shadow-overlay">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
              <Image
                src="/logo.png"
                alt="DoorSmith"
                width={140}
                height={23}
                className="h-6 w-auto"
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="focus-ring rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                Menu
              </p>
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
