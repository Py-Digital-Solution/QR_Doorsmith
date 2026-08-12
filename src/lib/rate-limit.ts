/**
 * Simple in-memory sliding-window rate limiter.
 * Not suitable for multi-instance deployments (use Redis there),
 * but sufficient for single-instance / Vercel serverless with warm functions.
 */

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/** Clean up expired keys every 5 minutes to prevent memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key.
 * @param key      Unique identifier (e.g. `login:${ip}` or `otp:${phone}`)
 * @param limit    Maximum requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: Entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  existing.count++;
  const remaining = Math.max(0, limit - existing.count);
  return {
    allowed: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  };
}

/** Helper: returns a NextResponse 429 JSON if rate limited, otherwise null */
export function rateLimitResponse(
  result: RateLimitResult,
): Response | null {
  if (result.allowed) return null;
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Limit": "0",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}
