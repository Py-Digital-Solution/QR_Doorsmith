import Image from "next/image";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "@/lib/nav";

export function Sidebar({
  items,
  className = "",
}: {
  items: NavItem[];
  className?: string;
}) {
  return (
    <aside
      className={`w-60 flex-col border-r border-gray-200 bg-white ${className}`}
    >
      <div className="flex h-16 items-center border-b border-gray-200 px-5">
        <Image
          src="/logo.png"
          alt="DoorSmith"
          width={140}
          height={23}
          priority
          className="h-6 w-auto"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Menu
        </p>
        <NavLinks items={items} />
      </div>
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="text-[11px] text-gray-400">DoorSmith Rewards</p>
      </div>
    </aside>
  );
}
