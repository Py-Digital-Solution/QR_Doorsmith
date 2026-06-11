import type { ReactNode } from "react";
import { CircleCheck, CircleAlert, Info } from "lucide-react";

const VARIANTS = {
  success: {
    cls: "border-green-200 bg-green-50 text-green-800",
    Icon: CircleCheck,
    iconCls: "text-green-600",
  },
  error: {
    cls: "border-red-200 bg-red-50 text-red-800",
    Icon: CircleAlert,
    iconCls: "text-red-600",
  },
  info: {
    cls: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: Info,
    iconCls: "text-blue-600",
  },
} as const;

export function Alert({
  variant,
  children,
  className = "",
}: {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
  className?: string;
}) {
  const { cls, Icon, iconCls } = VARIANTS[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${cls} ${className}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconCls}`} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
