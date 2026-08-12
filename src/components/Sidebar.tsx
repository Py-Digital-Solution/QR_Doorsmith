import Image from "next/image";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "@/lib/nav";

export function Sidebar({
  items,
  className = "",
  branding,
}: {
  items: NavItem[];
  className?: string;
  branding?: { name: string; logo: string };
}) {
  const companyName = branding?.name || "DoorSmith";
  const logoUrl = branding?.logo || "/logo.png";

  return (
    <aside
      className={`w-60 flex-col border-r border-gray-200 bg-white ${className}`}
    >
      <div className="flex h-16 items-center border-b border-gray-200 px-4 overflow-hidden">
        {logoUrl.startsWith("data:") || logoUrl.startsWith("http") || logoUrl.startsWith("/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={companyName}
            className="max-h-12 w-full object-contain object-left"
          />
        ) : (
          <span className="text-lg font-bold tracking-tight text-brand">
            {companyName}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Menu
        </p>
        <NavLinks items={items} />
      </div>
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="text-[11px] text-gray-400">{companyName} Rewards</p>
      </div>
    </aside>
  );
}
