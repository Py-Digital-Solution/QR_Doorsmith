import { Skeleton } from "./ui/Skeleton";

/** Loading placeholder for list pages (header + table rows). */
export function ListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48 bg-gray-100" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-gray-100 px-4 py-3.5 last:border-0"
          >
            <Skeleton className="h-4 w-1/4 bg-gray-100" />
            <Skeleton className="h-4 w-1/6 bg-gray-100" />
            <Skeleton className="hidden h-4 w-1/4 bg-gray-100 sm:block" />
            <Skeleton className="ml-auto h-4 w-16 bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
