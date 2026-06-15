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
          {/* Mobile: logo only (navigation lives in the bottom bar) */}
          <Image
            src="/logo.png"
            alt="DoorSmith"
            width={120}
            height={20}
            className="h-5 w-auto md:hidden"
          />
          <HeaderTitle items={navItems} />
          {/* Account menu is desktop-only; on mobile it lives in the "More" sheet */}
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* pb-24 on mobile clears the fixed bottom nav */}
          <div className="w-full p-4 pb-24 sm:p-6 md:pb-6 lg:p-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation (hidden on desktop) */}
      <MobileNav items={navItems} user={user} />
    </div>
  );
}
