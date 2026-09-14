// In-memory rate limiter for the agent endpoint, to cap Amazon Bedrock usage on
// the public demo. Two gates:
//   - per-IP:  a few analyses per minute (abuse protection, applies to everyone)
//   - global:  a daily ceiling on requests that use OUR server credentials
//              (hard cost cap; BYOK requests use the visitor's own key so they
//              don't count toward this).
//
// State lives on globalThis because Next bundles routes separately (same pattern
// as erpRegistry / conversationStore). It's per-container and resets on restart —
// good enough for cost protection on a single-instance demo.

type Bucket = { count: number; resetAt: number };
type Store = { ip: Map<string, Bucket>; global: Bucket };

const g = globalThis as unknown as { __caRateLimit?: Store };
const store: Store =
  g.__caRateLimit ??
  (g.__caRateLimit = { ip: new Map(), global: { count: 0, resetAt: 0 } });

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const PER_IP = num(process.env.RATE_LIMIT_PER_IP, 5);
const PER_IP_WINDOW_MS = num(process.env.RATE_LIMIT_PER_IP_WINDOW_SEC, 60) * 1000;
const GLOBAL_PER_DAY = num(process.env.RATE_LIMIT_GLOBAL_PER_DAY, 200);
const DAY_MS = 24 * 60 * 60 * 1000;
const DISABLED = /^(1|true|yes)$/i.test(process.env.RATE_LIMIT_DISABLED ?? "");

function hit(bucket: Bucket, limit: number, windowMs: number, now: number) {
  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export type RateResult =
  | { ok: true }
  | { ok: false; reason: "ip" | "global"; retryAfterSec: number };

/**
 * Consume one unit of quota. `countGlobal` should be true only for requests that
 * spend our own Bedrock credentials (i.e. not BYOK).
 */
export function checkRateLimit(opts: {
  ip: string;
  countGlobal: boolean;
}): RateResult {
  if (DISABLED) return { ok: true };
  const now = Date.now();

  // Opportunistic cleanup so the IP map can't grow unbounded.
  if (store.ip.size > 5000) {
    for (const [k, b] of store.ip) if (now >= b.resetAt) store.ip.delete(k);
  }

  let ipBucket = store.ip.get(opts.ip);
  if (!ipBucket) {
    ipBucket = { count: 0, resetAt: 0 };
    store.ip.set(opts.ip, ipBucket);
  }
  const ipRes = hit(ipBucket, PER_IP, PER_IP_WINDOW_MS, now);
  if (!ipRes.ok) return { ok: false, reason: "ip", retryAfterSec: ipRes.retryAfterSec };

  if (opts.countGlobal) {
    const gRes = hit(store.global, GLOBAL_PER_DAY, DAY_MS, now);
    if (!gRes.ok)
      return { ok: false, reason: "global", retryAfterSec: gRes.retryAfterSec };
  }

  return { ok: true };
}
