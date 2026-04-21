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

export function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xReal = req.headers.get("x-real-ip");
  if (xReal) return xReal.trim();
  // Fall back to a bucket so tests / localhost don't all collapse to empty string.
  return "unknown";
}

export function hashIp(ipOrReq: string | Request): string {
  const ip = typeof ipOrReq === "string" ? ipOrReq : extractIp(ipOrReq);
  const h = createHash("sha256");
  h.update(`${env.ipSalt}:${todaySaltKey()}:${ip}`);
  return h.digest("hex");
}
