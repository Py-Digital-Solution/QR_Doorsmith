"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Download, FileText, ChevronDown } from "lucide-react";

interface FilterBarProps {
  placeholder?: string;
  /** Identifies which dataset to export (passed to /api/export?type=…) */
  exportType: string;
  /**
   * Extra params merged into the export URL only (not the page query string).
   * Use for values that live in the route path rather than the query string,
   * e.g. the batch id on /admin/qr/[id].
   */
  exportParams?: Record<string, string | undefined>;
}

function FilterBarInner({ placeholder, exportType, exportParams }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const currentPageSize = searchParams.get("pageSize") ?? "10";

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.set("page", "1");
    return `${pathname}?${params.toString()}`;
  }

  // Debounced search  replace (not push) to avoid polluting history
  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => {
        router.replace(buildUrl({ q: q || undefined }));
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function handlePageSize(value: string) {
    startTransition(() => {
      router.push(buildUrl({ pageSize: value }));
    });
  }

  function buildExportUrl(format: "xlsx" | "pdf") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", exportType);
    params.set("format", format);
    params.delete("page");
    params.delete("pageSize");
    for (const [k, v] of Object.entries(exportParams ?? {})) {
      if (v) params.set(k, v);
    }
    return `/api/export?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search…"}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
      </div>

      {/* Page size */}
      <div className="relative">
        <select
          value={currentPageSize}
          onChange={(e) => handlePageSize(e.target.value)}
          className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        >
          <option value="10">10 / page</option>
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
      </div>

      {/* Export buttons */}
      <div className="flex shrink-0 gap-2">
        <a
          href={buildExportUrl("xlsx")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-card hover:bg-gray-50"
        >
          <Download className="size-3.5 text-green-600" aria-hidden />
          Excel
        </a>
        <a
          href={buildExportUrl("pdf")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-card hover:bg-gray-50"
        >
          <FileText className="size-3.5 text-red-500" aria-hidden />
          PDF
        </a>
      </div>
    </div>
  );
}

/** Search bar + page size selector + Excel/PDF export for any list page. */
export function FilterBar(props: FilterBarProps) {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-gray-100" />}>
      <FilterBarInner {...props} />
    </Suspense>
  );
}
