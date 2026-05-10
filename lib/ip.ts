/**
 * IP hashing — we NEVER store a raw IP. `hashIp` produces a daily-salted
 * sha256 that's stable for the same IP within a UTC day but not reversible.
 *
 * Used by rate limiting and by audit queries on LessonRun.
 */

import { createHash } from "node:crypto";
import { env } from "./env";

function todaySaltKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Anything with a Headers-shaped `.get(name)` — `Headers`, `ReadonlyHeaders`. */
interface HeadersLike {
  get(name: string): string | null;
}

export function extractIp(req: Request): string {
  return ipFromHeaders(req.headers);
}

function ipFromHeaders(headers: HeadersLike): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xReal = headers.get("x-real-ip");
  if (xReal) return xReal.trim();
  // Fall back to a bucket so tests / localhost don't all collapse to empty string.
  return "unknown";
}

export function hashIp(input: string | Request | HeadersLike): string {
  let ip: string;
  if (typeof input === "string") {
    ip = input;
  } else if (input instanceof Request) {
    ip = extractIp(input);
  } else {
    ip = ipFromHeaders(input);
  }
  const h = createHash("sha256");
  h.update(`${env.ipSalt}:${todaySaltKey()}:${ip}`);
  return h.digest("hex");
}
