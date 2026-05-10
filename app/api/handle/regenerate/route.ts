/**
 * POST /api/handle/regenerate
 *
 * Clears the tlc_handle cookie. The next request re-enters middleware,
 * which sees no handle and issues a fresh one. The client triggers this
 * from the demo-mode banner's "new handle" link, then reloads.
 *
 * Note: handles attached to past LessonRun.authorHandle rows do NOT
 * change — the field is denormalized at create time on purpose. Old
 * lessons keep crediting the previous handle.
 */

import { NextResponse } from "next/server";
import { HANDLE_COOKIE } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: HANDLE_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
