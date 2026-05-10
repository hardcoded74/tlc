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

/**
 * Gemma 4 frequently omits optional fields entirely rather than emitting
 * `null`. Zod distinguishes `undefined` (missing) from `null` by default,
 * which turns every omission into a validation error. These helpers build
 * schemas whose inputs accept undefined|null|T and whose output is T|null,
 * keeping the downstream type model simple while tolerating model quirks.
 */
function nullishString() {
  return z
    .preprocess(
      (v) => {
        if (Array.isArray(v)) {
          return v
            .filter((x) => x != null)
            .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
            .join(" ");
        }
        return v;
      },
      z.string().nullable().optional(),
    )
    .transform((v) => (v == null || v === "" ? null : v));
}

function nullishObject<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .nullable()
    .optional()
    .transform((v) => v ?? null);
}

/**
 * Local Selene 26B-A4B sometimes returns prose fields as arrays of
 * strings (e.g. lesson_steps[i].student_action = ["Read silently",
 * "Discuss with partner"]) when the schema expects a single string.
 * Cloud Gemma 4 dense honors the string type more reliably. This
 * helper accepts string|string[] and joins arrays with " " so the
 * lesson still succeeds — same content, single field.
 */
function flexibleString() {
  return z.preprocess(
    (v) => {
      if (Array.isArray(v)) {
        return v
          .filter((x) => x != null)
          .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
          .join(" ");
      }
      return v;
    },
    z.string().min(1),
  );
}

/**
 * Rename keys in an object using a `from → to` map. Only renames if the
 * target key is not already present, so legitimate mixed-key inputs aren't
 * clobbered. Used to coerce LoRA-tuned model quirks (e.g. "misception"
 * → "misconception") into the canonical schema shape.
 */
function renameKeys(
  obj: Record<string, unknown>,
  map: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const [bad, good] of Object.entries(map)) {
    if (bad in out && !(good in out)) {
      out[good] = out[bad];
      delete out[bad];
    }
  }
  return out;
}

/**
 * Array variant that silently drops entries that fail validation, instead
 * of failing the whole lesson. Use for arrays where partial data is
 * preferable to no data at all (vocabulary, misconceptions). The
 * orchestrator's gatekeeper retry handles whole-scaffold failures; this
 * just keeps a single bad entry from triggering one.
 */
function lossyArray<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return v;
      return v.filter((item) => schema.safeParse(item).success);
    },
    z.array(schema),
  );
}

// ──────────────────────────────────────────────────────────────────────
// Source origin — required on every content field
// ──────────────────────────────────────────────────────────────────────

// Synonym map for source_origin — LoRA-tuned models sometimes emit
// adjacent strings ("general_knowledge", "unknown", "from source") that
// mean exactly one of the canonical values. Coerce silently before
// hitting the strict enum so a near-miss doesn't waste a retry.
const SOURCE_ORIGIN_SYNONYMS: Record<string, string> = {
  // → generated
  "general_knowledge": "generated",
  "general knowledge": "generated",
  "general": "generated",
  "model": "generated",
  "model_knowledge": "generated",
  "ai": "generated",
  "fabricated": "generated",
  // → not_applicable
  "unknown": "not_applicable",
  "unspecified": "not_applicable",
  "n/a": "not_applicable",
  "na": "not_applicable",
  "none": "not_applicable",
  "null": "not_applicable",
  "not applicable": "not_applicable",
  // → grounded
  "source": "grounded",
  "from_source": "grounded",
  "from source": "grounded",
  "given": "grounded",
  "provided": "grounded",
  "verbatim": "grounded",
  "direct": "grounded",
  "direct_quote": "grounded",
  // → scaffolded
  "summary": "scaffolded",
  "summarized": "scaffolded",
  "paraphrased": "scaffolded",
  "scaffold": "scaffolded",
  "based_on_source": "scaffolded",
  "derived": "scaffolded",
  "rephrased": "scaffolded",
};

export const SourceOriginSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const lc = v.trim().toLowerCase();
    return SOURCE_ORIGIN_SYNONYMS[lc] ?? lc;
  },
  z.enum(["grounded", "scaffolded", "generated", "not_applicable"]),
);

// ──────────────────────────────────────────────────────────────────────
// Leaf schemas
// ──────────────────────────────────────────────────────────────────────

// quantity: Gemma 4 sometimes emits bare numbers ("quantity": 3); coerce.
export const MaterialSchema = z.object({
  name: z.string().min(1),
  quantity: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => (v == null || v === "" ? null : String(v))),
  source_origin: SourceOriginSchema,
});

export const LessonStepSchema = z.object({
  step: z.number().int().positive(),
  minutes: z.number().int().positive(),
  teacher_action: flexibleString(),
  student_action: flexibleString(),
  source_origin: SourceOriginSchema,
});

const ENGAGEMENT_TYPE_SYNONYMS: Record<string, string> = {
  "warm up": "warm_up",
  "warm-up": "warm_up",
  warmup: "warm_up",
  hook: "warm_up",
  opener: "warm_up",
  "do now": "warm_up",
  "bell ringer": "warm_up",
  "partner activity": "partner_activity",
  "partner-activity": "partner_activity",
  pair: "partner_activity",
  "pair share": "partner_activity",
  "think-pair-share": "partner_activity",
  "small group": "partner_activity",
  "quick check": "quick_check",
  "quick-check": "quick_check",
  check: "quick_check",
  "check for understanding": "quick_check",
  cfu: "quick_check",
  "interactive prompt": "interactive_prompt",
  "interactive-prompt": "interactive_prompt",
  prompt: "interactive_prompt",
  poll: "interactive_prompt",
  question: "interactive_prompt",
};

export const EngagementSchema = z.object({
  type: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const norm = v.toLowerCase().trim();
      return ENGAGEMENT_TYPE_SYNONYMS[norm] ?? v;
    },
    z.enum([
      "warm_up",
      "discussion",
      "partner_activity",
      "quick_check",
      "interactive_prompt",
    ]),
  ),
  prompt: flexibleString(),
  minutes: z.number().int().positive(),
  source_origin: SourceOriginSchema,
});

export const DemonstrationSchema = z.object({
  description: flexibleString(),
  materials_needed: z.array(z.string()),
  teacher_tip: nullishString(),
  safety_notes: nullishString(),
  source_origin: SourceOriginSchema,
});

export const GuidedPracticeSchema = z.object({
  description: flexibleString(),
  format: z.enum(["whole_class", "pair", "small_group"]),
  duration_minutes: z.number().int().positive(),
  source_origin: SourceOriginSchema,
});

export const IndependentPracticeSchema = z.object({
  description: flexibleString(),
  duration_minutes: z.number().int().positive(),
  deliverable: nullishString(),
  source_origin: SourceOriginSchema,
});

export const AssessmentQuestionSchema = z.object({
  id: z.string().regex(/^q\d+$/, "question IDs must match /^q\\d+$/"),
  question: flexibleString(),
  expected_answer: flexibleString(),
  rubric_notes: nullishString(),
  source_origin: SourceOriginSchema,
});

// Common natural-language variants the model emits → our canonical
// snake_case enum values. Selene's local 26B-A4B is sloppier with
// strict enums than dense Gemma 4 — coercion here keeps a single
// stylistic miss from failing the whole lesson.
const ASSESSMENT_FORMAT_SYNONYMS: Record<string, string> = {
  "exit ticket": "exit_ticket",
  "exit-ticket": "exit_ticket",
  exitticket: "exit_ticket",
  ticket: "exit_ticket",
  test: "quiz",
  exam: "quiz",
  examination: "quiz",
  assessment: "quiz",
  "comprehension check": "comprehension_check",
  "comprehension-check": "comprehension_check",
  comprehension: "comprehension_check",
  "check for understanding": "comprehension_check",
  observation: "comprehension_check",
  oral: "comprehension_check",
  verbal: "comprehension_check",
  discussion: "comprehension_check",
  demonstration: "comprehension_check",
  performance: "comprehension_check",
  "written response": "written_response",
  "written-response": "written_response",
  writing: "written_response",
  essay: "written_response",
  paragraph: "written_response",
  homework: "written_response",
  assignment: "written_response",
};

export const AssessmentSchema = z.object({
  format: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const norm = v.toLowerCase().trim();
      return ASSESSMENT_FORMAT_SYNONYMS[norm] ?? v;
    },
    z.enum([
      "exit_ticket",
      "quiz",
      "worksheet",
      "comprehension_check",
      "written_response",
    ]),
  ),
  questions: z.array(AssessmentQuestionSchema).min(1),
  estimated_minutes: z.number().int().positive(),
});

export const DiscussionPromptSchema = z.object({
  prompt: flexibleString(),
  purpose: z.enum([
    "activate_prior_knowledge",
    "deepen_understanding",
    "extend_beyond_lesson",
    "check_misconception",
  ]),
  source_origin: SourceOriginSchema,
});

// Christine v2 LoRA sometimes uses alternative key names for the term
// (and occasionally drops it entirely — handled by lossyArray below).
const VOCABULARY_KEY_ALIASES: Record<string, string> = {
  name: "term",
  word: "term",
  vocab: "term",
  vocabulary: "term",
  vocabulary_term: "term",
};

export const VocabularyTermSchema = z.preprocess(
  (v) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? renameKeys(v as Record<string, unknown>, VOCABULARY_KEY_ALIASES)
      : v,
  z.object({
    term: z.string().min(1),
    definition: flexibleString(),
    example: nullishString(),
    source_origin: SourceOriginSchema,
  }),
);

// Christine v2 LoRA sometimes emits "misception" instead of "misconception"
// (one-letter typo picked up during fine-tuning). Coerce common near-miss
// key names so a single training quirk doesn't waste a gatekeeper retry.
const MISCONCEPTION_KEY_ALIASES: Record<string, string> = {
  misception: "misconception",
  misconcept: "misconception",
  misunderstanding: "misconception",
};

export const MisconceptionSchema = z.preprocess(
  (v) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? renameKeys(v as Record<string, unknown>, MISCONCEPTION_KEY_ALIASES)
      : v,
  z.object({
    misconception: flexibleString(),
    correction: flexibleString(),
    how_to_address: flexibleString(),
  }),
);

export const DifferentiationSchema = z.object({
  struggling: flexibleString(),
  advanced: flexibleString(),
  multilingual_learners: nullishString(),
  source_origin: SourceOriginSchema,
});

export const AccommodationsSchema = z.object({
  visual_supports: nullishString(),
  auditory_supports: nullishString(),
  motor_supports: nullishString(),
  cognitive_supports: nullishString(),
  behavioral_supports: nullishString(),
  general_notes: nullishString(),
  source_origin: SourceOriginSchema,
});

export const HomeworkSchema = z.object({
  description: flexibleString(),
  estimated_minutes: z.number().int().positive(),
  optional: z.boolean(),
  source_origin: SourceOriginSchema,
});

export const EnrichmentSchema = z.object({
  description: flexibleString(),
  for_students_who: flexibleString(),
  source_origin: SourceOriginSchema,
});

export const StandardReferenceSchema = z.object({
  framework: z.string().min(1),
  code: z.string().min(1),
  description: flexibleString(),
});

// Be lenient: Gemma sometimes omits standards_cited entirely or uses
// confidence values like "low" / "high" that aren't in our enum.
// Default the array, coerce unknown confidence values to "inferred".
export const StandardsAlignmentSchema = z.object({
  standards_cited: z.array(StandardReferenceSchema).default([]),
  confidence: z
    .preprocess(
      (v) =>
        typeof v === "string" &&
        ["teacher_provided", "inferred", "none"].includes(v)
          ? v
          : "inferred",
      z.enum(["teacher_provided", "inferred", "none"]),
    )
    .default("inferred"),
  notes: nullishString(),
});

export const HandoffNoteSchema = z.object({
  field: z.string().min(1),
  reason: z.enum(["partner_owns", "insufficient_context", "out_of_scope"]),
  note: nullishString(),
});

// ──────────────────────────────────────────────────────────────────────
// Top-level schemas
// ──────────────────────────────────────────────────────────────────────

export const LessonPackageSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(500),
  grade_level: z.string().min(1),
  subject: nullishString(),
  estimated_minutes: z.number().int().positive(),
  overview: z.string().min(1).max(1000),
  materials: z.array(MaterialSchema).min(1),
  lesson_steps: z.array(LessonStepSchema).min(1),
  engagement: EngagementSchema,
  demo: nullishObject(DemonstrationSchema),
  guided_practice: nullishObject(GuidedPracticeSchema),
  independent_practice: nullishObject(IndependentPracticeSchema),
  assessment: AssessmentSchema,
  teacher_notes: nullishString(),
  discussion_prompts: z.array(DiscussionPromptSchema),
  vocabulary: lossyArray(VocabularyTermSchema),
  misconceptions: lossyArray(MisconceptionSchema),
  differentiation: nullishObject(DifferentiationSchema),
  accommodations: nullishObject(AccommodationsSchema),
  homework: nullishObject(HomeworkSchema),
  enrichment: nullishObject(EnrichmentSchema),
  standards_alignment: nullishObject(StandardsAlignmentSchema),
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
  title: flexibleString(),
  objective: flexibleString(),
  grade_level: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  overview: flexibleString(),
  materials: z.array(MaterialSchema),
  lesson_steps: z.array(LessonStepSchema),
  engagement: EngagementSchema,
  demo: nullishObject(DemonstrationSchema),
  assessment: AssessmentSchema,
  teacher_notes: nullishString(),
  discussion_prompts: z.array(DiscussionPromptSchema).default([]),
  vocabulary: lossyArray(VocabularyTermSchema).default([]),
  misconceptions: lossyArray(MisconceptionSchema).default([]),
  handoff_notes: z.array(HandoffNoteSchema).default([]),
});

/**
 * Delta-shape emitted by PACKAGE_TOOL in Phase 3. Everything optional
 * except persona — the merge layer inherits unset fields from the
 * corresponding Phase 1 scaffold. Extended fields (differentiation,
 * accommodations, etc.) are attached separately via PackagePhaseExtended.
 */
export const PersonaScaffoldDeltaSchema = z.object({
  persona: z.enum(["hunter", "christine"]),
  title: z.string().min(1).optional(),
  objective: z.string().min(1).optional(),
  grade_level: z.string().min(1).optional(),
  estimated_minutes: z.number().int().positive().optional(),
  overview: z.string().min(1).optional(),
  materials: z.array(MaterialSchema).optional(),
  lesson_steps: z.array(LessonStepSchema).optional(),
  engagement: EngagementSchema.optional(),
  demo: nullishObject(DemonstrationSchema),
  assessment: AssessmentSchema.optional(),
  teacher_notes: nullishString(),
  discussion_prompts: z.array(DiscussionPromptSchema).optional(),
  vocabulary: lossyArray(VocabularyTermSchema).optional(),
  misconceptions: lossyArray(MisconceptionSchema).optional(),
  handoff_notes: z.array(HandoffNoteSchema).optional(),
});

export const ReviewIssueSchema = z.object({
  id: z.string().regex(/^issue-(?:verify-(?:std-)?)?\d+$/),
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
  problem: flexibleString(),
  fix: flexibleString(),
});

export const VerificationSourceRefSchema = z.object({
  name: z.string(),
  url: z.string().url().nullable(),
  excerpt: z.string().nullable(),
});

export const VerificationFindingSchema = z.object({
  id: z.string().regex(/^verify-(?:std-)?\d+$/),
  claim_kind: z.enum(["vocabulary", "misconception", "standards_code"]),
  claim_subject: z.string().min(1),
  claim_text: z.string().min(1),
  status: z.enum(["verified", "unverified", "contradicted"]),
  sources: z.array(VerificationSourceRefSchema).default([]),
  notes: nullishString(),
});

export const VerificationReportSchema = z.object({
  generated_at: z.string(),
  total_checked: z.number().int().nonnegative(),
  verified_count: z.number().int().nonnegative(),
  unverified_count: z.number().int().nonnegative(),
  contradicted_count: z.number().int().nonnegative(),
  findings: z.array(VerificationFindingSchema),
});

export const ReviewReportSchema = z.object({
  overall_assessment: z.enum([
    "strong_first_pass",
    "needs_revision",
    "must_regenerate",
  ]),
  grade_fit: z.object({
    rating: z.enum(["appropriate", "too_advanced", "too_basic"]),
    notes: nullishString(),
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
  verification: nullishObject(VerificationReportSchema),
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
  parentRunId: z.string().uuid().optional(),
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
