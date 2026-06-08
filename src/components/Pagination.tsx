import Link from "next/link";

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
  if (disabled) {
    return (
      <span className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-300">
        {children}
      </span>
    );
  }
  const sep = basePath.includes("?") ? "&" : "?";
  return (
    <Link
      href={`${basePath}${sep}page=${page}`}
      className="rounded-md border border-gray-300 px-3 py-1.5 transition-colors hover:border-brand hover:text-brand"
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
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <PageLink basePath={basePath} page={page - 1} disabled={page <= 1}>
          Prev
        </PageLink>
        <span className="text-xs text-gray-500">
          Page {page} of {pageCount}
        </span>
        <PageLink basePath={basePath} page={page + 1} disabled={page >= pageCount}>
          Next
        </PageLink>
      </div>
    </div>
  );
}
