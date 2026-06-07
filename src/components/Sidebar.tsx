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
    <aside className={`w-60 flex-col border-r border-gray-200 bg-white ${className}`}>
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
      <div className="flex-1 p-3">
        <NavLinks items={items} />
      </div>
    </aside>
  );
}
