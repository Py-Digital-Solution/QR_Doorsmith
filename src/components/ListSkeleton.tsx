/** Loading placeholder for list pages (header + table rows). */
export function ListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-0"
          >
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-1/6 animate-pulse rounded bg-gray-100" />
            <div className="hidden h-4 w-1/4 animate-pulse rounded bg-gray-100 sm:block" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
