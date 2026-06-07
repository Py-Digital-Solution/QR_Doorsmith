"use client";

import { useState } from "react";
import Image from "next/image";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "@/lib/nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
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
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-3">
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
