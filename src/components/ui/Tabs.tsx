import Link from "next/link";

export type TabItem = {
  href: string;
  label: string;
  count?: number;
  active: boolean;
};

/** URL-driven tab navigation (links, no client state). */
export function TabNav({ tabs }: { tabs: TabItem[] }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`focus-ring inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              t.active
                ? "border-brand text-brand-dark"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  t.active
                    ? "bg-brand-light text-brand-dark"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
