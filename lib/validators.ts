/**
 * TLC — Zod validators for runtime schema enforcement.
 *
 * Every tool-call output from Gemma 4 is validated through these
 * schemas before being persisted or returned to the client. If
 * validation fails, we retry once with the error appended to the
 * system prompt. If that also fails, we surface a clean error to the
 * UI — no silent fallbacks.
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────
// Source origin — required on every content field
// ──────────────────────────────────────────────────────────────────────

export const SourceOriginSchema = z.enum([
  "grounded",
  "scaffolded",
  "generated",
  "not_applicable",
]);

// ──────────────────────────────────────────────────────────────────────
// Leaf schemas
// ──────────────────────────────────────────────────────────────────────

export const MaterialSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const LessonStepSchema = z.object({
  step: z.number().int().positive(),
  minutes: z.number().int().positive(),
  teacher_action: z.string().min(1),
  student_action: z.string().min(1),
  source_origin: SourceOriginSchema,
});

export const EngagementSchema = z.object({
  type: z.enum([
    "warm_up",
    "discussion",
    "partner_activity",
    "quick_check",
    "interactive_prompt",
  ]),
  prompt: z.string().min(1),
  minutes: z.number().int().positive(),
  source_origin: SourceOriginSchema,
});

export const DemonstrationSchema = z.object({
  description: z.string().min(1),
  materials_needed: z.array(z.string()),
  teacher_tip: z.string().nullable(),
  safety_notes: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const GuidedPracticeSchema = z.object({
  description: z.string().min(1),
  format: z.enum(["whole_class", "pair", "small_group"]),
  duration_minutes: z.number().int().positive(),
  source_origin: SourceOriginSchema,
});

export const IndependentPracticeSchema = z.object({
  description: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  deliverable: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const AssessmentQuestionSchema = z.object({
  id: z.string().regex(/^q\d+$/, "question IDs must match /^q\\d+$/"),
  question: z.string().min(1),
  expected_answer: z.string().min(1),
  rubric_notes: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const AssessmentSchema = z.object({
  format: z.enum([
    "exit_ticket",
    "quiz",
    "worksheet",
    "comprehension_check",
    "written_response",
  ]),
  questions: z.array(AssessmentQuestionSchema).min(1),
  estimated_minutes: z.number().int().positive(),
});

export const DiscussionPromptSchema = z.object({
  prompt: z.string().min(1),
  purpose: z.enum([
    "activate_prior_knowledge",
    "deepen_understanding",
    "extend_beyond_lesson",
    "check_misconception",
  ]),
  source_origin: SourceOriginSchema,
});

export const VocabularyTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const MisconceptionSchema = z.object({
  misconception: z.string().min(1),
  correction: z.string().min(1),
  how_to_address: z.string().min(1),
});

export const DifferentiationSchema = z.object({
  struggling: z.string().min(1),
  advanced: z.string().min(1),
  multilingual_learners: z.string().nullable(),
  source_origin: SourceOriginSchema,
});

export const HomeworkSchema = z.object({
  description: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  optional: z.boolean(),
  source_origin: SourceOriginSchema,
});

export const EnrichmentSchema = z.object({
  description: z.string().min(1),
  for_students_who: z.string().min(1),
  source_origin: SourceOriginSchema,
});

export const StandardReferenceSchema = z.object({
  framework: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
});

export const StandardsAlignmentSchema = z.object({
  standards_cited: z.array(StandardReferenceSchema),
  confidence: z.enum(["teacher_provided", "inferred", "none"]),
  notes: z.string().nullable(),
});

export const HandoffNoteSchema = z.object({
  field: z.string().min(1),
  reason: z.enum(["partner_owns", "insufficient_context", "out_of_scope"]),
  note: z.string().nullable(),
});

// ──────────────────────────────────────────────────────────────────────
// Top-level schemas
// ──────────────────────────────────────────────────────────────────────

export const LessonPackageSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(500),
  grade_level: z.string().min(1),
  subject: z.string().nullable(),
  estimated_minutes: z.number().int().positive(),
  overview: z.string().min(1).max(1000),
  materials: z.array(MaterialSchema).min(1),
  lesson_steps: z.array(LessonStepSchema).min(1),
  engagement: EngagementSchema,
  demo: DemonstrationSchema.nullable(),
  guided_practice: GuidedPracticeSchema.nullable(),
  independent_practice: IndependentPracticeSchema.nullable(),
  assessment: AssessmentSchema,
  teacher_notes: z.string().nullable(),
  discussion_prompts: z.array(DiscussionPromptSchema),
  vocabulary: z.array(VocabularyTermSchema),
  misconceptions: z.array(MisconceptionSchema),
  differentiation: DifferentiationSchema.nullable(),
  homework: HomeworkSchema.nullable(),
  enrichment: EnrichmentSchema.nullable(),
  standards_alignment: StandardsAlignmentSchema.nullable(),
  generated_by: z.object({
    hunter_contribution_ids: z.array(z.string()),
    christine_contribution_ids: z.array(z.string()),
    review_id: z.string(),
  }),
  source_summary: z.object({
    source_id: z.string().nullable(),
    overall_grounding: z.enum([
      "fully_grounded",
      "partially_grounded",
      "no_source",
    ]),
    grounded_section_count: z.number().int().nonnegative(),
    generated_section_count: z.number().int().nonnegative(),
  }),
});

export const PersonaScaffoldSchema = z.object({
  persona: z.enum(["hunter", "christine"]),
  title: z.string().min(1),
  objective: z.string().min(1),
  grade_level: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  overview: z.string().min(1),
  materials: z.array(MaterialSchema),
  lesson_steps: z.array(LessonStepSchema),
  engagement: EngagementSchema,
  demo: DemonstrationSchema.nullable(),
  assessment: AssessmentSchema,
  teacher_notes: z.string().nullable(),
  discussion_prompts: z.array(DiscussionPromptSchema),
  vocabulary: z.array(VocabularyTermSchema),
  misconceptions: z.array(MisconceptionSchema),
  handoff_notes: z.array(HandoffNoteSchema),
});

export const ReviewIssueSchema = z.object({
  id: z.string().regex(/^issue-\d+$/),
  issue_type: z.enum([
    "grade_fit",
    "structure",
    "source",
    "consistency",
    "engagement",
    "demo",
    "assessment",
    "gap",
  ]),
  severity: z.enum(["must_fix", "should_fix", "nice_to_fix"]),
  where: z.string(),
  problem: z.string().min(1),
  fix: z.string().min(1),
});

export const ReviewReportSchema = z.object({
  overall_assessment: z.enum([
    "strong_first_pass",
    "needs_revision",
    "must_regenerate",
  ]),
  grade_fit: z.object({
    rating: z.enum(["appropriate", "too_advanced", "too_basic"]),
    notes: z.string().nullable(),
  }),
  source_alignment: z.enum([
    "fully_grounded",
    "partially_grounded",
    "minimal_source_use",
    "not_applicable",
  ]),
  issues: z.array(ReviewIssueSchema),
  must_fix_count: z.number().int().nonnegative(),
  should_fix_count: z.number().int().nonnegative(),
  nice_to_fix_count: z.number().int().nonnegative(),
  ready_for_packaging: z.boolean(),
});

// ──────────────────────────────────────────────────────────────────────
// API request validators
// ──────────────────────────────────────────────────────────────────────

export const CreateLessonRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  gradeLevel: z.string().min(1).max(50),
  classLength: z.number().int().positive().max(300).optional(),
  subject: z.string().max(100).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  sourceUploadId: z.string().uuid().optional(),
  options: z
    .object({
      differentiation: z.boolean().optional(),
      homework: z.boolean().optional(),
      enrichment: z.boolean().optional(),
    })
    .optional(),
});

// ──────────────────────────────────────────────────────────────────────
// Cross-field invariants
// ──────────────────────────────────────────────────────────────────────

/**
 * Runs AFTER Zod schema parse succeeds. Checks invariants that can't
 * be expressed in the schema alone (field-to-field consistency).
 * Returns an array of error messages; empty means valid.
 */
export function validateInvariants(
  pkg: z.infer<typeof LessonPackageSchema>,
): string[] {
  const errors: string[] = [];

  // Lesson step minutes should sum within ±5 of estimated_minutes
  const stepMinutesSum = pkg.lesson_steps.reduce((a, s) => a + s.minutes, 0);
  if (Math.abs(stepMinutesSum - pkg.estimated_minutes) > 5) {
    errors.push(
      `Sum of lesson_steps minutes (${stepMinutesSum}) differs from estimated_minutes (${pkg.estimated_minutes}) by more than 5.`,
    );
  }

  // Assessment question IDs are unique
  const qIds = pkg.assessment.questions.map((q) => q.id);
  if (new Set(qIds).size !== qIds.length) {
    errors.push(
      `Assessment question IDs must be unique. Got: ${qIds.join(", ")}`,
    );
  }

  // source_summary counts should match actual content origin tags
  const allContentWithOrigin: { source_origin: string }[] = [
    ...pkg.lesson_steps,
    pkg.engagement,
    ...(pkg.demo ? [pkg.demo] : []),
    ...pkg.assessment.questions,
    ...pkg.discussion_prompts,
    ...pkg.vocabulary,
    ...pkg.materials,
  ];

  const actualGrounded = allContentWithOrigin.filter(
    (s) => s.source_origin === "grounded",
  ).length;
  const actualGenerated = allContentWithOrigin.filter(
    (s) => s.source_origin === "generated",
  ).length;

  if (actualGrounded !== pkg.source_summary.grounded_section_count) {
    errors.push(
      `source_summary.grounded_section_count (${pkg.source_summary.grounded_section_count}) != actual grounded count (${actualGrounded}).`,
    );
  }
  if (actualGenerated !== pkg.source_summary.generated_section_count) {
    errors.push(
      `source_summary.generated_section_count (${pkg.source_summary.generated_section_count}) != actual generated count (${actualGenerated}).`,
    );
  }

  // Review issue counts
  // (only relevant for ReviewReport, not LessonPackage — skip here)

  return errors;
}
