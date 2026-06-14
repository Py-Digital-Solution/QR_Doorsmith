import type { ReactNode } from "react";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";
import { HeaderTitle } from "./HeaderTitle";
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
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <Sidebar items={navItems} className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
          <MobileNav items={navItems} />
          <Image
            src="/logo.png"
            alt="DoorSmith"
            width={120}
            height={20}
            className="h-5 w-auto md:hidden"
          />
          <HeaderTitle items={navItems} />
          <div className="ml-auto flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
