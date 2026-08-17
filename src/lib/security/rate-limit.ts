/**
 * In-memory fixed-window rate limiter.
 *
 * Scoped to a single Worker isolate, which is the honest description of what
 * it provides: it blunts a naive flood from one client, and it does not
 * coordinate across isolates or regions. A globally consistent limit would
 * need a Durable Object, and the specification is explicit that a binding is
 * only added for a defined need. The contact form is disabled by default and
 * is protected primarily by Turnstile; this limiter is the cheap second layer,
 * not the main control.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Entries are pruned opportunistically so the map cannot grow without bound. */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1_000;

  if (windows.size > MAX_TRACKED_KEYS) {
    for (const [entryKey, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(entryKey);
    }
  }

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client identifier from Cloudflare's headers.
 * Falls back to a shared bucket rather than trusting a spoofable header.
 */
export function clientKey(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return `ip:${cfIp}`;
  return "ip:unknown";
}

/** Test seam: clears all windows. */
export function resetRateLimits(): void {
  windows.clear();
}
