/**
 * TLC — Hunter and Christine persona system prompts.
 *
 * The actual prompt strings live in /prompts/*.md (versioned, with YAML
 * frontmatter) and are loaded via lib/prompts.ts. This module re-exports
 * them for callers and houses the dynamic context builders +
 * `buildRetryAddendum`, which composes static framing with run-time
 * scaffold/review/excerpt JSON.
 *
 * See prompts/README.md for the index and design rationale.
 */

export {
  HUNTER_SYSTEM_PROMPT,
  CHRISTINE_SYSTEM_PROMPT,
  REVIEW_SYSTEM_PROMPT,
  PHASE_1_BUILD_ADDENDUM,
  PHASE_3_PACKAGE_ADDENDUM,
} from "./prompts";

import {
  RETRY_HEADER,
  RETRY_EXCERPTS_INTRO,
  RETRY_TRAILER,
} from "./prompts";

/**
 * Appended to Phase 1 prompts when Review flagged the FIRST attempt with
 * must-fix issues. Includes the previous scaffold, the review findings,
 * and — when source verification flagged contradictions — excerpts from
 * Wikipedia / Wikidata for the contradicted claims, so the model can
 * self-correct from sources rather than just reading "fix this."
 */
export function buildRetryAddendum(args: {
  previousScaffold: unknown;
  partnerScaffold: unknown;
  review: unknown;
  contradictedExcerpts?: Array<{
    subject: string;
    sources: Array<{ name: string; url: string | null; excerpt: string | null }>;
    reason: string | null;
  }>;
}): string {
  const blocks: string[] = [
    "",
    RETRY_HEADER,
    "",
    "--- YOUR PREVIOUS SCAFFOLD ---",
    JSON.stringify(args.previousScaffold, null, 2),
    "",
    "--- PARTNER'S PREVIOUS SCAFFOLD (do not revise their fields) ---",
    JSON.stringify(args.partnerScaffold, null, 2),
    "",
    "--- REVIEW FINDINGS ---",
    JSON.stringify(args.review, null, 2),
  ];

  const excerpts = args.contradictedExcerpts ?? [];
  if (excerpts.length > 0) {
    blocks.push("");
    blocks.push(RETRY_EXCERPTS_INTRO);
    for (const e of excerpts) {
      blocks.push("");
      blocks.push(`* ${e.subject}`);
      if (e.reason) blocks.push(`  why flagged: ${e.reason}`);
      for (const s of e.sources) {
        if (!s.excerpt) continue;
        const url = s.url ? ` (${s.url})` : "";
        blocks.push(`  [${s.name}]${url} ${s.excerpt}`);
      }
    }
  }

  blocks.push("");
  blocks.push(RETRY_TRAILER);
  return blocks.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Context builder — produces the user-turn content with teacher input
// ──────────────────────────────────────────────────────────────────────

export interface ContextInput {
  topic: string;
  gradeLevel: string;
  classLength?: number | null;
  subject?: string | null;
  objective?: string | null;
  notes?: string | null;
  sourceText?: string | null;
  options?: {
    differentiation?: boolean;
    homework?: boolean;
    enrichment?: boolean;
  };
}

/**
 * Builds the user-turn content for a persona call.
 * The system prompt defines WHO the persona is; this builds WHAT they're asked to do.
 */
export function buildContext(input: ContextInput): string {
  const parts: string[] = [];

  parts.push(`Topic: ${input.topic}`);
  parts.push(`Grade level: ${input.gradeLevel}`);
  if (input.classLength) parts.push(`Class length: ${input.classLength} minutes`);
  if (input.subject) parts.push(`Subject: ${input.subject}`);
  if (input.objective) parts.push(`Teacher-provided objective: ${input.objective}`);
  if (input.notes) parts.push(`Teacher notes: ${input.notes}`);

  if (input.sourceText) {
    const truncated = input.sourceText.length > 8000
      ? input.sourceText.slice(0, 8000) + "\n[... source truncated at 8KB for context budget]"
      : input.sourceText;
    parts.push("");
    parts.push("--- TEACHER-PROVIDED SOURCE MATERIAL ---");
    parts.push(truncated);
    parts.push("--- END SOURCE MATERIAL ---");
    parts.push("");
    parts.push("Prefer this source for factual content. Label each output section's source_origin accordingly.");
  } else {
    parts.push("");
    parts.push("No teacher-provided source material. Use your general knowledge; label all sections with source_origin='not_applicable' (where appropriate) or 'generated'.");
  }

  if (input.options) {
    const enabled: string[] = [];
    if (input.options.differentiation) enabled.push("differentiation for struggling/advanced learners");
    if (input.options.homework) enabled.push("homework");
    if (input.options.enrichment) enabled.push("enrichment activity");
    if (enabled.length) {
      parts.push("");
      parts.push(`Teacher requested optional sections: ${enabled.join(", ")}.`);
    }
  }

  return parts.join("\n");
}

/**
 * Build a per-persona Phase 3 context.
 *
 * Each Phase 3 call previously received both full scaffolds plus the
 * review — ~8–10k input tokens per call, ~18k for the parallel pair.
 * That blew past the AI Studio 16k-input-tokens-per-minute paid-tier
 * cap on Gemma 4. The persona only needs their own scaffold in detail;
 * the partner is summarized to title + objective + handoff_notes
 * (everything they'd need to coordinate without re-reading partner
 * field content). Saves ~3–4k tokens per Phase 3 call, ~6–8k across
 * the parallel pair.
 */
export function buildPhase3Context(args: {
  baseContext: string;
  ownPersona: "hunter" | "christine";
  ownBuild: unknown;
  partnerBuild: unknown;
  review: unknown;
}): string {
  const ownLabel = args.ownPersona === "hunter" ? "Hunter" : "Christine";
  const partnerLabel = args.ownPersona === "hunter" ? "Christine" : "Hunter";

  // Pull the small handful of partner fields we actually need for
  // coordination. If the shape is unexpected, fall through with what
  // we have rather than throw — Phase 3 should still run.
  const p = args.partnerBuild as Record<string, unknown> | null | undefined;
  const partnerSummary = {
    title: p?.title,
    objective: p?.objective,
    handoff_notes: p?.handoff_notes,
  };

  return [
    args.baseContext,
    "",
    `--- YOUR (${ownLabel}'s) PHASE 1 SCAFFOLD ---`,
    JSON.stringify(args.ownBuild, null, 2),
    "",
    `--- PARTNER (${partnerLabel}'s) SUMMARY — do not revise their fields ---`,
    JSON.stringify(partnerSummary, null, 2),
    "",
    "--- REVIEW FINDINGS ---",
    JSON.stringify(args.review, null, 2),
    "--- END PRIOR CONTEXT ---",
  ].join("\n");
}

/**
 * Strip review-irrelevant noise from a scaffold so Phase 2 fits inside
 * the per-minute input-token cap.
 *
 * Drops: source_origin (review's per-section judgment), schema_version,
 * generated_by, source_summary. Truncates teacher_notes prose past 400
 * chars — review checks completeness, not the full body of teacher tips.
 */
function slimScaffoldForReview(scaffold: unknown): unknown {
  const DROP = new Set([
    "source_origin",
    "schema_version",
    "generated_by",
    "source_summary",
  ]);
  const stripped = JSON.parse(
    JSON.stringify(scaffold, (k, v) => (DROP.has(k) ? undefined : v)),
  );
  if (
    stripped &&
    typeof stripped === "object" &&
    typeof (stripped as Record<string, unknown>).teacher_notes === "string"
  ) {
    const tn = (stripped as Record<string, unknown>).teacher_notes as string;
    if (tn.length > 400) {
      (stripped as Record<string, unknown>).teacher_notes =
        tn.slice(0, 400) + "… [truncated for review]";
    }
  }
  return stripped;
}

/**
 * Builds the review context — review sees both scaffolds (slimmed) +
 * original input.
 */
export function buildReviewContext(args: {
  baseContext: string;
  hunterBuild: unknown;
  christineBuild: unknown;
}): string {
  return [
    args.baseContext,
    "",
    "--- HUNTER'S SCAFFOLD (structure-focused) ---",
    JSON.stringify(slimScaffoldForReview(args.hunterBuild), null, 2),
    "",
    "--- CHRISTINE'S SCAFFOLD (depth-focused) ---",
    JSON.stringify(slimScaffoldForReview(args.christineBuild), null, 2),
    "--- END SCAFFOLDS ---",
    "",
    "Review both scaffolds. Flag concrete issues. Propose fixes.",
  ].join("\n");
}
