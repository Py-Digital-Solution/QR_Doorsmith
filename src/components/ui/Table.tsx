import type { ReactNode } from "react";

type Align = "left" | "right" | "center";
const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/** Desktop table chrome — hidden on mobile (pair with MobileCardList). */
export function TableWrapper({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-card sm:block ${className}`}
    >
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50/80">{children}</tr>
    </thead>
  );
}

export function TH({
  align = "left",
  className = "",
  children,
}: {
  align?: Align;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase ${ALIGN[align]} ${className}`}
    >
      {children}
    </th>
  );
}

export function TR({
  interactive = false,
  className = "",
  children,
}: {
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr
      className={`border-b border-gray-100 transition-colors last:border-0 ${interactive ? "hover:bg-gray-50/70" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({
  align = "left",
  className = "",
  children,
}: {
  align?: Align;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td className={`px-4 py-3 ${ALIGN[align]} ${className}`}>{children}</td>
  );
}

/** Mobile stacked-card list — hidden on sm+ (pair with TableWrapper). */
export function MobileCardList({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`space-y-3 sm:hidden ${className}`}>{children}</div>;
}

export function MobileCard({
  title,
  badge,
  actions,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm font-medium text-gray-900">{title}</div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {children && (
        <div className="mt-2 space-y-1 text-xs text-gray-500">{children}</div>
      )}
      {actions && (
        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3">
          {actions}
        </div>
      )}
    </div>
  );
}
