/**
 * Pseudonymous browser handles — like "TeacherSparrow42".
 *
 * Issued by middleware on first visit, signed with IP_SALT, persisted as a
 * 1-year cookie. No PII; per-browser only; user can regenerate via the
 * demo-mode banner. Used to prefill the testimonial author name and to
 * credit remixes via LessonRun.authorHandle.
 *
 * The cookie format is `handle.signature` where `signature` is a hex-encoded
 * HMAC-SHA256 over `handle` with IP_SALT as the key. Tampered cookies fail
 * verification and are treated as absent.
 */

import { createHash, createHmac, randomInt } from "node:crypto";
import { env } from "./env";

export const HANDLE_COOKIE = "tlc_handle";

const ADJECTIVES = [
  "Brave", "Bright", "Calm", "Clever", "Curious", "Eager", "Friendly",
  "Gentle", "Happy", "Kind", "Lively", "Lucky", "Merry", "Nimble",
  "Patient", "Playful", "Quick", "Quiet", "Quirky", "Sharp", "Steady",
  "Sunny", "Swift", "Thoughtful", "Tidy", "Witty", "Wise", "Zesty",
  "Bold", "Cheery",
];

const ANIMALS = [
  "Sparrow", "Otter", "Fox", "Heron", "Badger", "Lynx", "Magpie",
  "Owl", "Robin", "Wren", "Hare", "Stoat", "Falcon", "Marten",
  "Ibis", "Kite", "Mole", "Newt", "Pika", "Quail", "Raven",
  "Salmon", "Tern", "Viper", "Whale", "Yak", "Antelope", "Beaver",
  "Crane", "Dolphin",
];

export function generateHandle(): string {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const num = String(randomInt(100)).padStart(2, "0");
  return `${adj}${animal}${num}`;
}

function sign(value: string): string {
  return createHmac("sha256", env.ipSalt).update(value).digest("hex");
}

/** Pack a handle into the signed cookie value. */
export function packHandle(handle: string): string {
  return `${handle}.${sign(handle)}`;
}

/** Unpack a signed cookie value; returns null on tamper or malformed input. */
export function unpackHandle(cookieValue: string | null | undefined): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 1) return null;
  const handle = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!handle || !sig) return null;
  // Constant-time compare via sha256 to avoid early-exit timing tells.
  const expected = sign(handle);
  if (sha256(expected) !== sha256(sig)) return null;
  return handle;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Read the handle from a fetch Request's Cookie header. Verifies signature. */
export function getHandleFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === HANDLE_COOKIE) {
      return unpackHandle(decodeURIComponent(rest.join("=")));
    }
  }
  return null;
}
