/**
 * Per-IP rate limit bucket.
 *
 * Window: 1 hour. Default limit: 10 lessons per window. A judge-mode
 * request bypasses the limit (enforced at the route handler).
 *
 * The DB row is keyed on (ipHash, windowStart). We floor the current time
 * to the hour and upsert. Cheap, correct, no extra infra.
 */

import { prisma } from "./prisma";

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  windowStart: Date;
  windowEnd: Date;
  retryAfterSeconds: number | null;
}

const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;

function floorToHour(d: Date): Date {
  const copy = new Date(d.getTime());
  copy.setMinutes(0, 0, 0);
  return copy;
}

export async function checkRateLimit(
  ipHash: string,
  limit: number = DEFAULT_LIMIT,
): Promise<RateLimitStatus> {
  const now = new Date();
  const windowStart = floorToHour(now);
  const windowEnd = new Date(windowStart.getTime() + WINDOW_MS);

  // Read current bucket (don't increment yet — consume only on success).
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { ipHash_windowStart: { ipHash, windowStart } },
  });

  const used = bucket?.requestCount ?? 0;
  const remaining = Math.max(limit - used, 0);
  const allowed = used < limit;

  return {
    allowed,
    limit,
    used,
    remaining,
    windowStart,
    windowEnd,
    retryAfterSeconds: allowed
      ? null
      : Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
  };
}

/** Call this AFTER a request has been accepted to increment the bucket. */
export async function consumeRateLimit(ipHash: string): Promise<void> {
  const windowStart = floorToHour(new Date());
  await prisma.rateLimitBucket.upsert({
    where: { ipHash_windowStart: { ipHash, windowStart } },
    create: { ipHash, windowStart, requestCount: 1 },
    update: { requestCount: { increment: 1 } },
  });
}
