import type { ReactNode } from "react";

export type BadgeTone = "gray" | "green" | "yellow" | "red" | "blue" | "brand";

const TONES: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-600 ring-gray-500/10",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  brand: "bg-brand-light text-brand-dark ring-brand/20",
};

/** Map a domain status string to a badge tone. */
export function statusTone(status: string): BadgeTone {
  switch (status.toLowerCase()) {
    case "active":
    case "approved":
    case "printed":
    case "completed":
    case "scanned":
      return "green";
    case "pending":
    case "generated":
      return "yellow";
    case "rejected":
    case "suspended":
    case "void":
    case "inactive":
    case "blocked":
      return "red";
    case "dispatched":
    case "in_warehouse":
      return "blue";
    case "archived":
      return "gray";
    default:
      return "gray";
  }
}

export function Badge({
  tone = "gray",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
