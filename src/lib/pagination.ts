/** Shared pagination helpers used by every list service + page. */

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export type Pagination = { page: number; pageSize: number };

export type Paginated<T> = {
  items: T[];
  page: number; // 1-based
  pageSize: number;
  total: number;
  pageCount: number;
};

function first(v?: string | string[]): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Parse `?page=&pageSize=` search params into a safe, clamped Pagination. */
export function parsePageParams(sp: {
  page?: string | string[];
  pageSize?: string | string[];
}): Pagination {
  const page = Math.max(1, parseInt(first(sp.page) ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(first(sp.pageSize) ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize };
}

export function paginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: Pagination,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
