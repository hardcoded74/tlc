/**
 * TLC proxy (Next.js 16 routing middleware) — issues a pseudonymous browser
 * handle on first visit.
 *
 * No login. The handle (e.g. "BraveOtter42") is generated server-side from
 * a fixed word list, signed with IP_SALT, and persisted as a 1-year cookie.
 * It pre-fills the testimonial form's name field and is attached to any
 * lessons the user creates as `LessonRun.authorHandle`. Per-browser only —
 * not cross-device, not an identity, no PII collected. See DATA_PRIVACY.md.
 *
 * Skips static assets and the cron prune endpoint to avoid mutating
 * Set-Cookie on responses no human will read.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateHandle, packHandle, unpackHandle, HANDLE_COOKIE } from "@/lib/handle";

const HANDLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Paths we deliberately do NOT mutate Set-Cookie on. Cron is
// system-to-system, /api/health is polled by uptime monitors, and the
// download endpoint serves an attachment that browsers should not get a
// cookie set against. Everything else gets the handle.
const SKIP_PREFIXES = ["/api/cron", "/api/health"];
const SKIP_SUFFIXES = ["/download"];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return NextResponse.next();
  if (SKIP_SUFFIXES.some((s) => path.endsWith(s))) return NextResponse.next();

  const existing = req.cookies.get(HANDLE_COOKIE)?.value;
  if (existing && unpackHandle(existing)) {
    return NextResponse.next();
  }

  const handle = generateHandle();
  const signed = packHandle(handle);

  const res = NextResponse.next();
  res.cookies.set({
    name: HANDLE_COOKIE,
    value: signed,
    maxAge: HANDLE_COOKIE_MAX_AGE,
    httpOnly: false, // intentionally readable from JS — UI displays it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
