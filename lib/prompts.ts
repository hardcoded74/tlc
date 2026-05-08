/**
 * Prompt loader — reads versioned markdown prompts from `/prompts/` at
 * module load time and exports them as named string constants.
 *
 * Why a separate loader (vs inlining the strings in TS):
 * - Every prompt that goes to Gemma 4 should be human-readable on
 *   GitHub without a dev environment. Markdown renders cleanly there.
 * - Versioning lives in YAML frontmatter at the top of each file, so
 *   the version is part of the file rather than a TS comment that can
 *   drift.
 * - Future bumps can be done by editing the markdown alone (and
 *   bumping the `version:` line), no TS changes required for the
 *   prompt text itself.
 *
 * Strict path inputs only — Next.js outputFileTracing follows literal
 * `readFileSync` paths and bundles the prompts/ directory automatically.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROMPTS_DIR = join(process.cwd(), "prompts");

/** Read a prompt file, strip the YAML frontmatter block, return the body. */
function loadPrompt(name: string): string {
  const raw = readFileSync(join(PROMPTS_DIR, name), "utf-8").replace(/^﻿/, "");
  if (!raw.startsWith("---\n")) return raw.trim();
  // Find the closing '---' on its own line, starting after the opening one.
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return raw.trim();
  return raw.slice(end + 5).trim();
}

/** Extract a labeled section from retry.framing.md ("# header" / "# excerpts_intro" / "# trailer"). */
function loadRetrySection(label: "header" | "excerpts_intro" | "trailer"): string {
  const body = loadPrompt("retry.framing.md");
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of body.split("\n")) {
    const m = /^# (\w+)\s*$/.exec(line);
    if (m) {
      if (current) sections[current] = buf.join("\n").trim();
      current = m[1];
      buf = [];
      continue;
    }
    buf.push(line);
  }
  if (current) sections[current] = buf.join("\n").trim();
  const out = sections[label];
  if (!out) throw new Error(`retry.framing.md missing section: ${label}`);
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Persona system prompts
// ──────────────────────────────────────────────────────────────────────

export const HUNTER_SYSTEM_PROMPT = loadPrompt("hunter.system.md");
export const CHRISTINE_SYSTEM_PROMPT = loadPrompt("christine.system.md");
export const REVIEW_SYSTEM_PROMPT = loadPrompt("review.system.md");

// ──────────────────────────────────────────────────────────────────────
// Phase addenda
// ──────────────────────────────────────────────────────────────────────

// Original constants in lib/personas.ts started with two leading newlines
// before the `---` separator; preserve that exact spacing so prompt
// concatenation against the persona system prompt is byte-identical.
export const PHASE_1_BUILD_ADDENDUM = "\n\n" + loadPrompt("build.addendum.md");
export const PHASE_3_PACKAGE_ADDENDUM = "\n\n" + loadPrompt("package.addendum.md");

// ──────────────────────────────────────────────────────────────────────
// Verifier
// ──────────────────────────────────────────────────────────────────────

export const CONTRADICTION_SYSTEM_PROMPT = loadPrompt("verifier.contradiction.md");

// ──────────────────────────────────────────────────────────────────────
// Retry framing — discrete strings the function in personas.ts joins
// with the dynamic scaffold/review/excerpt JSON.
// ──────────────────────────────────────────────────────────────────────

export const RETRY_HEADER = loadRetrySection("header");
export const RETRY_EXCERPTS_INTRO = loadRetrySection("excerpts_intro");
export const RETRY_TRAILER = loadRetrySection("trailer");
