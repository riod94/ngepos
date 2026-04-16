/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a Map to track request counts per key within a sliding window.
 */
const store = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., IP + endpoint)
 * @param maxAttempts - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

/** Helper to extract client IP from request */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Standard rate limit error response */
export function rateLimitResponse() {
  return Response.json(
    { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
    { status: 429 }
  );
}
