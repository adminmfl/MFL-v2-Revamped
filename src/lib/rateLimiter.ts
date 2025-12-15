// Simple in-memory rate limiter (Map-based). NOTE: this does NOT persist across server
// instances and is intended as a lightweight local/server-single-instance fallback.
// For production multi-instance deployments, use a centralized store (Redis/Upstash).

type Entry = { count: number; expiresAt: number };
const store = new Map<string, Entry>();

function now() {
  return Date.now();
}

export async function checkRateLimit(key: string, limit: number, windowSec: number) {
  const ttlMs = windowSec * 1000;
  const rec = store.get(key);
  const current = now();
  if (!rec || rec.expiresAt <= current) {
    store.set(key, { count: 1, expiresAt: current + ttlMs });
    return { allowed: 1 <= limit, remaining: Math.max(0, limit - 1), reset: windowSec };
  }

  rec.count += 1;
  store.set(key, rec);
  const allowed = rec.count <= limit;
  const reset = Math.max(0, Math.ceil((rec.expiresAt - current) / 1000));
  return { allowed, remaining: Math.max(0, limit - rec.count), reset };
}

export async function rateLimitEmailAndIP(email: string, ip: string) {
  // per-email: 5 per hour, per-IP: 50 per hour
  const emailKey = `rl:email:${email}:1h`;
  const ipKey = `rl:ip:${ip}:1h`;
  const [emailRes, ipRes] = await Promise.all([
    checkRateLimit(emailKey, 5, 60 * 60),
    checkRateLimit(ipKey, 50, 60 * 60),
  ]);
  return { emailRes, ipRes };
}

// Expose store for testing/debugging hooks if needed
export const _rateStore = store;

export default null;
type Bucket = {
  tokens: number;
  last: number;
};

const buckets = new Map<string, Bucket>();

// Simple token-bucket rate limiter (in-memory). NOT suitable for multi-instance production.
// For production use a shared store (Redis) and implement a proper fixed window or sliding window limiter.
export function isRateLimited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, last: now });
    return false;
  }

  const elapsed = now - bucket.last;
  // Refill tokens proportional to elapsed time
  const refill = Math.floor((elapsed / windowMs) * limit);
  if (refill > 0) {
    bucket.tokens = Math.min(limit, bucket.tokens + refill);
    bucket.last = now;
  }

  if (bucket.tokens <= 0) {
    return true;
  }

  bucket.tokens -= 1;
  bucket.last = now;
  buckets.set(key, bucket);
  return false;
}

// For memory hygiene: periodically clear very old buckets
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets.entries()) {
    if (now - b.last > 60 * 60 * 1000) buckets.delete(k);
  }
}, 30 * 60 * 1000);
