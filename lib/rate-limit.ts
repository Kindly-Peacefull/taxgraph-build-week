const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStoreGlobal = typeof globalThis & {
  __taxgraphRateLimitStore?: Map<string, RateLimitBucket>;
};

const rateLimitGlobal = globalThis as RateLimitStoreGlobal;
const rateLimitStore =
  rateLimitGlobal.__taxgraphRateLimitStore ??
  (rateLimitGlobal.__taxgraphRateLimitStore = new Map());

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (!value) return fallback;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return fallback;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function requestClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidate =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown-client";
  return candidate.slice(0, 128);
}

function evictExpiredBuckets(now: number) {
  if (rateLimitStore.size < MAX_BUCKETS) return;
  for (const [key, bucket] of rateLimitStore) {
    if (bucket.resetAt <= now) rateLimitStore.delete(key);
  }
}

export function consumeRateLimit(
  scope: string,
  clientIdentifier: string,
  limit: number,
  now = Date.now(),
): RateLimitResult {
  evictExpiredBuckets(now);
  let key = `${scope}:${clientIdentifier}`;
  if (rateLimitStore.size >= MAX_BUCKETS && !rateLimitStore.has(key)) {
    key = `${scope}:overflow`;
  }
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult, now = Date.now()) {
  const resetSeconds = Math.max(0, Math.ceil((result.resetAt - now) / 1000));
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(resetSeconds),
    ...(result.allowed ? {} : { "Retry-After": String(resetSeconds) }),
  };
}

export function resetRateLimitsForTests() {
  rateLimitStore.clear();
}
