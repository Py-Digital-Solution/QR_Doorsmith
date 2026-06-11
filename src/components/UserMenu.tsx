"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "./Avatar";
import type { UserRole } from "@/lib/roles";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales_rep: "Sales Rep",
  distributor: "Distributor",
  counter: "Counter",
  khati: "Khati",
};

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
        aria-expanded={open}
        className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-100"
      >
        <Avatar name={user.name || user.email} size={28} />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 sm:inline">
          {label}
        </span>
        <ChevronDown
          className={`hidden size-3.5 text-gray-400 transition-transform sm:inline ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-overlay">
            <div className="border-b border-gray-100 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-gray-900">{label}</p>
              <span className="mt-1 inline-flex items-center rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <User className="size-4 text-gray-400" aria-hidden />
              Profile
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Settings className="size-4 text-gray-400" aria-hidden />
                Settings
              </Link>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
