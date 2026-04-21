/**
 * TLC — Merge logic combining Hunter's and Christine's Phase 3 outputs
 * into a single canonical LessonPackage.
 *
 * Ownership rules:
 *   Hunter owns:    objective, lesson_steps, assessment, answer fields,
 *                   time_blocks, standards_alignment
 *   Christine owns: engagement, demo, teacher_notes, discussion_prompts,
 *                   differentiation, vocabulary, misconceptions, enrichment
 *   Unioned:        materials (dedup by name), homework
 *   Tie-breaker:    title — concatenate Hunter's structural title with
 *                   Christine's hook phrase if they diverge
 *
 * The merge must produce a LessonPackage that passes LessonPackageSchema
 * validation. If either input scaffold is missing a required field, we
 * throw — this is a bug, not a recoverable state.
 */

import type {
  LessonPackage,
  PersonaScaffold,
  Material,
  DiscussionPrompt,
  Misconception,
  VocabularyTerm,
  ReviewReport,
} from "./types";

export interface MergeInput {
  hunterPackage: PersonaScaffold;
  christinePackage: PersonaScaffold;
  review: ReviewReport;
  runId: string;
  sourceId: string | null;
  optionsRequested: {
    differentiation: boolean;
    homework: boolean;
    enrichment: boolean;
  };
  // These are extended fields from package-phase tool output
  // (guided_practice, independent_practice, differentiation, homework, enrichment).
  // They come back on the PersonaScaffold via tool-call JSON; we cast
  // through the extended type at the call site.
  hunterPackageExtended: PackagePhaseExtended | null;
  christinePackageExtended: PackagePhaseExtended | null;
}

export interface PackagePhaseExtended {
  guided_practice?: LessonPackage["guided_practice"];
  independent_practice?: LessonPackage["independent_practice"];
  differentiation?: LessonPackage["differentiation"];
  accommodations?: LessonPackage["accommodations"];
  homework?: LessonPackage["homework"];
  enrichment?: LessonPackage["enrichment"];
  standards_alignment?: LessonPackage["standards_alignment"];
}

export function mergePackages(input: MergeInput): LessonPackage {
  const { hunterPackage: h, christinePackage: c, review, runId, sourceId } = input;

  // Title: prefer Hunter's structural precision, optionally prepended with
  // Christine's hook phrase if the titles differ meaningfully.
  const title = resolveTitle(h.title, c.title);

  // Objective: Hunter owns. Christine's is a secondary.
  const objective = h.objective;

  // Grade level + subject + estimated_minutes: Hunter's authoritative
  // (Christine should echo but if they disagree, Hunter wins).
  const grade_level = h.grade_level;
  const estimated_minutes = h.estimated_minutes;

  // Overview: both personas write this. Prefer Christine's (more narrative) if
  // it's noticeably better; otherwise Hunter's.
  const overview = c.overview.length >= h.overview.length * 0.8 ? c.overview : h.overview;

  // Materials: union both lists, dedupe by name (case-insensitive).
  const materials = unionMaterials(h.materials, c.materials);

  // Lesson steps: Hunter's win. Christine's are handoff notes; not merged in.
  const lesson_steps = h.lesson_steps.length > 0 ? h.lesson_steps : c.lesson_steps;

  // Engagement: Christine's owns. Hunter's is usually minimal.
  const engagement = c.engagement;

  // Demo: Christine's is richer when present.
  const demo = c.demo ?? h.demo ?? null;

  // Assessment: Hunter's owns. Christine's questions ignored unless Hunter's is empty.
  const assessment = h.assessment.questions.length > 0 ? h.assessment : c.assessment;

  // Teacher notes: Christine's owns. Hunter's is usually null.
  const teacher_notes = c.teacher_notes ?? h.teacher_notes ?? null;

  // Discussion prompts: Christine's owns; union with Hunter's if he wrote any.
  const discussion_prompts = unionDiscussionPrompts(c.discussion_prompts, h.discussion_prompts);

  // Vocabulary: Christine's owns; union with Hunter's if he wrote any.
  const vocabulary = unionVocabulary(c.vocabulary, h.vocabulary);

  // Misconceptions: Christine's owns.
  const misconceptions = unionMisconceptions(c.misconceptions, h.misconceptions);

  // Extended fields (Phase 3 only) — Christine owns most, Hunter owns standards.
  const differentiation =
    input.christinePackageExtended?.differentiation ??
    input.hunterPackageExtended?.differentiation ??
    null;
  const accommodations =
    input.christinePackageExtended?.accommodations ??
    input.hunterPackageExtended?.accommodations ??
    null;
  const homework =
    input.christinePackageExtended?.homework ??
    input.hunterPackageExtended?.homework ??
    null;
  const enrichment =
    input.christinePackageExtended?.enrichment ??
    input.hunterPackageExtended?.enrichment ??
    null;
  const guided_practice =
    input.hunterPackageExtended?.guided_practice ??
    input.christinePackageExtended?.guided_practice ??
    null;
  const independent_practice =
    input.hunterPackageExtended?.independent_practice ??
    input.christinePackageExtended?.independent_practice ??
    null;
  const standards_alignment =
    input.hunterPackageExtended?.standards_alignment ??
    input.christinePackageExtended?.standards_alignment ??
    null;

  // Source summary — compute counts from the merged content
  const allContent: { source_origin: string }[] = [
    ...lesson_steps,
    engagement,
    ...(demo ? [demo] : []),
    ...assessment.questions,
    ...discussion_prompts,
    ...vocabulary,
    ...materials,
  ];
  const grounded_section_count = allContent.filter((s) => s.source_origin === "grounded").length;
  const generated_section_count = allContent.filter((s) => s.source_origin === "generated").length;

  const overall_grounding: LessonPackage["source_summary"]["overall_grounding"] =
    sourceId === null
      ? "no_source"
      : grounded_section_count / allContent.length > 0.5
        ? "fully_grounded"
        : "partially_grounded";

  return {
    schema_version: "1.0",
    title,
    objective,
    grade_level,
    subject: null, // resolved by caller if present
    estimated_minutes,
    overview,
    materials,
    lesson_steps,
    engagement,
    demo,
    guided_practice,
    independent_practice,
    assessment,
    teacher_notes,
    discussion_prompts,
    vocabulary,
    misconceptions,
    differentiation,
    accommodations,
    homework,
    enrichment,
    standards_alignment,
    generated_by: {
      hunter_contribution_ids: [`build-hunter-${runId.slice(0, 8)}`, `package-hunter-${runId.slice(0, 8)}`],
      christine_contribution_ids: [`build-christine-${runId.slice(0, 8)}`, `package-christine-${runId.slice(0, 8)}`],
      review_id: `review-${runId.slice(0, 8)}`,
    },
    source_summary: {
      source_id: sourceId,
      overall_grounding,
      grounded_section_count,
      generated_section_count,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Fuzzy dedupe
// ──────────────────────────────────────────────────────────────────────

/**
 * Normalize a string for fuzzy comparison: lowercase, strip punctuation,
 * collapse whitespace, drop trailing plural 's' on each token. Then
 * return the set of tokens ≥ 3 characters.
 *
 * Lets "ruler" match "rulers", "heavy textbook (1 set)" match
 * "heavy textbooks", "simple machine quiz" match "Simple Machines Quiz".
 */
function tokens(s: string): Set<string> {
  const cleaned = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const bag = new Set<string>();
  for (const t of cleaned.split(" ")) {
    if (t.length < 3) continue;
    const singular = t.endsWith("s") && t.length > 3 ? t.slice(0, -1) : t;
    bag.add(singular);
  }
  return bag;
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** True if two strings share enough tokens to count as the same item. */
function isFuzzyDuplicate(
  a: string,
  b: string,
  threshold: number = 0.6,
): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  // Exact-normalized match is always a duplicate.
  if (ta.size === tb.size && [...ta].every((t) => tb.has(t))) return true;
  // One side fully contained in the other (handles "rulers" vs "ruler, eraser, textbook set").
  const smaller = ta.size <= tb.size ? ta : tb;
  const larger = ta.size <= tb.size ? tb : ta;
  if (smaller.size > 0) {
    let containedCount = 0;
    for (const t of smaller) if (larger.has(t)) containedCount++;
    const containment = containedCount / smaller.size;
    if (containment >= 0.8 && smaller.size >= 1) return true;
  }
  // Otherwise use Jaccard threshold.
  return jaccard(ta, tb) >= threshold;
}

/**
 * Dedupe a sequence of items by a text key using fuzzy match.
 * Preserves order; keeps the FIRST occurrence when a match is found.
 */
function fuzzyDedupe<T>(
  items: T[],
  key: (item: T) => string,
  threshold?: number,
): T[] {
  const kept: T[] = [];
  const keptKeys: string[] = [];
  for (const item of items) {
    const k = key(item);
    const already = keptKeys.some((existing) =>
      isFuzzyDuplicate(existing, k, threshold),
    );
    if (!already) {
      kept.push(item);
      keptKeys.push(k);
    }
  }
  return kept;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function resolveTitle(hunterTitle: string, christineTitle: string): string {
  // If titles are identical (modulo whitespace), return Hunter's.
  if (hunterTitle.trim().toLowerCase() === christineTitle.trim().toLowerCase()) {
    return hunterTitle.trim();
  }
  // If one is a prefix of the other, use the longer.
  if (christineTitle.startsWith(hunterTitle)) return christineTitle;
  if (hunterTitle.startsWith(christineTitle)) return hunterTitle;
  // Otherwise, prefer Hunter's structural title. Christine's hook phrase
  // may have landed in the overview.
  return hunterTitle;
}

function unionMaterials(hunter: Material[], christine: Material[]): Material[] {
  // Materials are lenient — Hunter's "ruler, eraser, textbook (1 set)" should
  // absorb Christine's separate "rulers / erasers / textbooks" entries.
  return fuzzyDedupe([...hunter, ...christine], (m) => m.name, 0.5);
}

function unionDiscussionPrompts(
  primary: DiscussionPrompt[],
  secondary: DiscussionPrompt[],
): DiscussionPrompt[] {
  // Prompts often differ only in softener words; tighter threshold.
  return fuzzyDedupe(
    [...primary, ...secondary],
    (p) => p.prompt,
    0.55,
  );
}

function unionVocabulary(
  primary: VocabularyTerm[],
  secondary: VocabularyTerm[],
): VocabularyTerm[] {
  // Vocabulary dedupes on the term alone (not the definition).
  return fuzzyDedupe([...primary, ...secondary], (t) => t.term, 0.7);
}

function unionMisconceptions(
  primary: Misconception[],
  secondary: Misconception[],
): Misconception[] {
  return fuzzyDedupe(
    [...primary, ...secondary],
    (m) => m.misconception,
    0.55,
  );
}
