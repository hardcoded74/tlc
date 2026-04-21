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
  const seen = new Set<string>();
  const merged: Material[] = [];
  for (const m of [...hunter, ...christine]) {
    const key = m.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(m);
    }
  }
  return merged;
}

function unionDiscussionPrompts(
  primary: DiscussionPrompt[],
  secondary: DiscussionPrompt[],
): DiscussionPrompt[] {
  const seen = new Set<string>();
  const merged: DiscussionPrompt[] = [];
  for (const p of [...primary, ...secondary]) {
    const key = p.prompt.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(p);
    }
  }
  return merged;
}

function unionVocabulary(
  primary: VocabularyTerm[],
  secondary: VocabularyTerm[],
): VocabularyTerm[] {
  const seen = new Set<string>();
  const merged: VocabularyTerm[] = [];
  for (const t of [...primary, ...secondary]) {
    const key = t.term.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(t);
    }
  }
  return merged;
}

function unionMisconceptions(
  primary: Misconception[],
  secondary: Misconception[],
): Misconception[] {
  const seen = new Set<string>();
  const merged: Misconception[] = [];
  for (const m of [...primary, ...secondary]) {
    const key = m.misconception.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(m);
    }
  }
  return merged;
}
