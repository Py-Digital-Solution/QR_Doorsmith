import type { ReactNode } from "react";
import { ICONS, type IconName } from "./icons";

const TONES = {
  default: "bg-gray-100 text-gray-500",
  brand: "bg-brand-light text-brand-dark",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
} as const;

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          {label}
        </p>
        {Icon && (
          <span
            className={`flex size-8 items-center justify-center rounded-md ${TONES[tone]}`}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
