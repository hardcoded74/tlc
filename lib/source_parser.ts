/**
 * Source parser — accepts teacher-provided text and normalizes it for
 * lesson grounding.
 *
 * For the MVP we handle two paths:
 *   1. Pasted text (the PRIMARY UX — no file, just text in a textarea)
 *   2. Uploaded .txt or .md files (decoded as UTF-8)
 *
 * PDF support is deferred — pdf-parse ships native bindings that don't
 * always play nicely with Vercel's edge runtime. When we add it, it
 * lives behind a feature check; for now, the UI asks teachers to paste
 * the relevant excerpt instead.
 */

import { createHash } from "node:crypto";

export const MAX_SOURCE_CHARS = 16_000;
export const CONTEXT_TRUNCATION_CHARS = 8_000;

export interface ParsedSource {
  text: string;
  charCount: number;
  contentHash: string;
  parseMethod: "text" | "markdown" | "pdf_pypdf";
  truncated: boolean;
  preview: string;
}

export interface ParseInput {
  raw: string;
  parseMethod: "text" | "markdown" | "pdf_pypdf";
}

function clean(input: string): string {
  // Normalize whitespace, strip obvious page headers/footers like "Page 3 of 12".
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^Page \d+\s+of\s+\d+$/gm, "")
    .trim();
}

export function parseTextSource(input: ParseInput): ParsedSource {
  const cleaned = clean(input.raw);
  const truncated = cleaned.length > MAX_SOURCE_CHARS;
  const text = truncated ? cleaned.slice(0, MAX_SOURCE_CHARS) : cleaned;

  const hash = createHash("sha256").update(text).digest("hex");
  const preview = text.slice(0, 280) + (text.length > 280 ? "…" : "");

  return {
    text,
    charCount: text.length,
    contentHash: hash,
    parseMethod: input.parseMethod,
    truncated,
    preview,
  };
}

export function inferParseMethod(filename: string | null): ParsedSource["parseMethod"] {
  if (!filename) return "text";
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  return "text";
}
