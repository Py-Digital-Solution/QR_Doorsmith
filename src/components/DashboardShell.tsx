import type { ReactNode } from "react";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";
import type { NavItem } from "@/lib/nav";
import type { UserRole } from "@/lib/roles";

export function DashboardShell({
  navItems,
  user,
  children,
}: {
  navItems: NavItem[];
  user: { name?: string; email?: string; role: UserRole };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={navItems} className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-2 border-b border-gray-200 bg-white px-4 sm:px-6">
          <MobileNav items={navItems} />
          <Image
            src="/logo.png"
            alt="DoorSmith"
            width={120}
            height={20}
            className="h-5 w-auto md:hidden"
          />
          <div className="ml-auto flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
