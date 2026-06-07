/** Pure product constants — safe for client + server (no DB imports). */
export const PRODUCT_STATUSES = ["active", "inactive"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
