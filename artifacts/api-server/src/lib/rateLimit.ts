import type { RequestHandler } from "express";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  maxBuckets?: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createFixedWindowRateLimit({
  limit,
  windowMs,
  maxBuckets = 10_000,
}: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  let overflowBucket: RateLimitBucket | undefined;

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let previous = buckets.get(key);
    let useOverflowBucket = false;

    if (!previous && buckets.size >= maxBuckets) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= maxBuckets) {
        useOverflowBucket = true;
        previous = overflowBucket;
      }
    }

    const bucket = !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : previous;
    bucket.count += 1;
    if (useOverflowBucket) overflowBucket = bucket;
    else buckets.set(key, bucket);

    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "Too many attempts. Try again later." });
      return;
    }

    next();
  };
}
