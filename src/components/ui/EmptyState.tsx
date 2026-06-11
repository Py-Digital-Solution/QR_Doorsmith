import type { ReactNode } from "react";
import { ICONS, type IconName } from "./icons";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-gray-100">
        <Icon className="size-5 text-gray-400" aria-hidden />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
