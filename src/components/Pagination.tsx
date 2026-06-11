import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PageLink({
  basePath,
  page,
  disabled,
  children,
}: {
  basePath: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
  if (disabled) {
    return (
      <span className={`${cls} border-gray-200 bg-gray-50 text-gray-300`}>
        {children}
      </span>
    );
  }
  const sep = basePath.includes("?") ? "&" : "?";
  return (
    <Link
      href={`${basePath}${sep}page=${page}`}
      className={`${cls} focus-ring border-gray-300 bg-white text-gray-700 shadow-card hover:border-brand hover:text-brand`}
    >
      {children}
    </Link>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span className="text-xs text-gray-500 sm:text-sm">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-700">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <PageLink basePath={basePath} page={page - 1} disabled={page <= 1}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </PageLink>
        <span className="text-xs text-gray-500">
          Page {page} of {pageCount}
        </span>
        <PageLink basePath={basePath} page={page + 1} disabled={page >= pageCount}>
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </PageLink>
      </div>
    </div>
  );
}
