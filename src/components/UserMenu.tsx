"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar } from "./Avatar";
import type { UserRole } from "@/lib/roles";

export function UserMenu({
  user,
}: {
  user: { name?: string; email?: string; role: UserRole };
}) {
  const [open, setOpen] = useState(false);
  const label = user.name || user.email || "Account";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100"
      >
        <Avatar name={user.name || user.email} size={28} />
        <span className="hidden max-w-[10rem] truncate text-sm text-gray-700 sm:inline">
          {label}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Profile
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/settings"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
