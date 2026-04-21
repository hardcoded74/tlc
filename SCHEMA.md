# TLC — Structured Output Schema

The contract between Gemma 4 and the rest of TLC. Every field has a
TypeScript type, a Zod validator, and a reason for existing. If the
model's tool-call output doesn't pass Zod validation, we retry once
with the error appended — no silent fallbacks.

This document is the source of truth. `prisma/schema.prisma` mirrors
the JSON shape; `lib/types.ts` and `lib/validators.ts` implement it in
code.

---

## 1. Design Principles

### 1.1 Strict typing, nullable intent
Every optional field is explicitly `.nullable()` in Zod and `| null` in
TypeScript. We never use `undefined` for "not provided" — null is an
explicit statement, undefined is missing data. This matters because
Gemma's tool-call output occasionally drops optional fields; we want
that to fail validation, not silently succeed.

### 1.2 Source origin is required on every content field
There's no un-labeled content. `source_origin` is a required field on
every lesson step, assessment question, demonstration, and discussion
prompt. If Gemma emits a field without a `source_origin`, validation
fails and we retry. This is the accuracy story.

### 1.3 Enums over free strings
Any field with a closed set of values is a TypeScript literal union +
Zod enum. `engagement.type`, `assessment.format`, `source_origin`,
`issue_type`, `severity` — all enumerated. The model produces junk
outside enums less often when enums are declared in the function
schema; Zod catches anything that slips through.

### 1.4 Versioned schema
Every Prisma `LessonRun.finalPackage` JSON column carries a
`schema_version: "1.0"` field. If we ever migrate the shape, old rows
don't need rewriting — the UI renders by version.

### 1.5 Symmetric between phases where possible
`SCAFFOLD_TOOL` (Phase 1) and `PACKAGE_TOOL` (Phase 3) share most of
their schema; Package just adds optional fields like `differentiation`,
`homework`, and `handoff_note`. This minimizes cognitive surface.

---

## 2. TypeScript Types

### 2.1 Source Origin Taxonomy

```typescript
// lib/types.ts

/**
 * How a given content field relates to teacher-provided source material.
 * Every content field in a lesson package carries this label.
 */
export type SourceOrigin =
  | "grounded"     // Content traces DIRECTLY to provided source material
  | "scaffolded"   // Teacher's source shaped the structure; wording is generated
  | "generated"    // Open generation; no source ties (flagged for teacher review)
  | "not_applicable"; // No teacher source was provided; label N/A
```

### 2.2 Lesson Package (Final Output)

```typescript
export interface LessonPackage {
  schema_version: "1.0";

  // Identity
  title: string;
  objective: string;
  grade_level: string;         // e.g. "5th grade", "9-10", "elementary"
  subject: string | null;      // e.g. "Science"; null if not specified
  estimated_minutes: number;   // integer

  // Structure
  overview: string;            // 2-3 sentence summary
  materials: Material[];
  lesson_steps: LessonStep[];

  // Activities
  engagement: Engagement;
  demo: Demonstration | null;
  guided_practice: GuidedPractice | null;
  independent_practice: IndependentPractice | null;

  // Assessment
  assessment: Assessment;

  // Teacher-facing depth
  teacher_notes: string | null;
  discussion_prompts: DiscussionPrompt[];
  vocabulary: VocabularyTerm[];
  misconceptions: Misconception[];

  // Optional enhancements
  differentiation: Differentiation | null;
  homework: Homework | null;
  enrichment: Enrichment | null;
  standards_alignment: StandardsAlignment | null;

  // Attribution & provenance
  generated_by: {
    hunter_contribution_ids: string[];   // which Hunter build/package call
    christine_contribution_ids: string[]; // which Christine build/package call
    review_id: string;                    // which review call
  };
  source_summary: {
    source_id: string | null;             // null if no teacher source
    overall_grounding: "fully_grounded" | "partially_grounded" | "no_source";
    grounded_section_count: number;
    generated_section_count: number;
  };
}
```

### 2.3 Sub-types

```typescript
export interface Material {
  name: string;                // "clear plastic sandwich bag"
  quantity: string | null;     // "24" or "one per pair" — free-form because realistic
  source_origin: SourceOrigin;
}

export interface LessonStep {
  step: number;                // 1, 2, 3, ...
  minutes: number;             // integer; sum of these should match estimated_minutes
  teacher_action: string;
  student_action: string;
  source_origin: SourceOrigin;
}

export interface Engagement {
  type:
    | "warm_up"
    | "discussion"
    | "partner_activity"
    | "quick_check"
    | "interactive_prompt";
  prompt: string;              // the actual thing the teacher says
  minutes: number;
  source_origin: SourceOrigin;
}

export interface Demonstration {
  description: string;
  materials_needed: string[];
  teacher_tip: string | null;  // optional; e.g. "do this on two plants for comparison"
  safety_notes: string | null;
  source_origin: SourceOrigin;
}

export interface GuidedPractice {
  description: string;
  format: "whole_class" | "pair" | "small_group";
  duration_minutes: number;
  source_origin: SourceOrigin;
}

export interface IndependentPractice {
  description: string;
  duration_minutes: number;
  deliverable: string | null;  // what students hand in, if anything
  source_origin: SourceOrigin;
}

export interface Assessment {
  format:
    | "exit_ticket"
    | "quiz"
    | "worksheet"
    | "comprehension_check"
    | "written_response";
  questions: AssessmentQuestion[];
  estimated_minutes: number;
}

export interface AssessmentQuestion {
  id: string;                  // "q1", "q2" — stable for answer key lookup
  question: string;
  expected_answer: string;
  rubric_notes: string | null; // "full credit for any 2 of 3 inputs"
  source_origin: SourceOrigin;
}

export interface DiscussionPrompt {
  prompt: string;
  purpose:
    | "activate_prior_knowledge"
    | "deepen_understanding"
    | "extend_beyond_lesson"
    | "check_misconception";
  source_origin: SourceOrigin;
}

export interface VocabularyTerm {
  term: string;
  definition: string;
  example: string | null;
  source_origin: SourceOrigin;
}

export interface Misconception {
  misconception: string;       // "plants eat dirt"
  correction: string;          // "plants absorb minerals, but make their own food from air/water/light"
  how_to_address: string;      // teacher-facing: "when a student says this, try..."
}

export interface Differentiation {
  struggling: string;
  advanced: string;
  multilingual_learners: string | null;
  source_origin: SourceOrigin;
}

export interface Homework {
  description: string;
  estimated_minutes: number;
  optional: boolean;
  source_origin: SourceOrigin;
}

export interface Enrichment {
  description: string;
  for_students_who: string;    // "finish early" | "show mastery" | "want extension"
  source_origin: SourceOrigin;
}

export interface StandardsAlignment {
  standards_cited: StandardReference[];
  confidence: "teacher_provided" | "inferred" | "none";
  notes: string | null;
}

export interface StandardReference {
  framework: string;           // "NGSS" | "Common Core Math" | "state:AZ" | "free-form"
  code: string;                // "5-LS1-1"
  description: string;
}
```

### 2.4 Build-Phase Output (Single Persona Scaffold)

```typescript
/**
 * What Hunter or Christine emits during Phase 1 (Build).
 * Contains the same structural fields as LessonPackage but OPTIONAL
 * because each persona fills only their owned fields; merge combines them.
 */
export interface PersonaScaffold {
  persona: "hunter" | "christine";
  title: string;
  objective: string;
  grade_level: string;
  estimated_minutes: number;
  overview: string;
  materials: Material[];
  lesson_steps: LessonStep[];
  engagement: Engagement;
  demo: Demonstration | null;
  assessment: Assessment;

  // Christine-only in practice, but declared null-allowed for both
  teacher_notes: string | null;
  discussion_prompts: DiscussionPrompt[];
  vocabulary: VocabularyTerm[];
  misconceptions: Misconception[];

  // A persona can mark fields they deliberately left to their partner
  handoff_notes: HandoffNote[];
}

export interface HandoffNote {
  field: string;               // "teacher_notes" | "differentiation" | ...
  reason: "partner_owns" | "insufficient_context" | "out_of_scope";
  note: string | null;
}
```

### 2.5 Review-Phase Output

```typescript
export interface ReviewReport {
  overall_assessment:
    | "strong_first_pass"
    | "needs_revision"
    | "must_regenerate";     // rare; only when scaffolds are unusable

  grade_fit: {
    rating: "appropriate" | "too_advanced" | "too_basic";
    notes: string | null;
  };

  source_alignment:
    | "fully_grounded"
    | "partially_grounded"
    | "minimal_source_use"
    | "not_applicable";

  issues: ReviewIssue[];

  must_fix_count: number;
  should_fix_count: number;
  nice_to_fix_count: number;
  ready_for_packaging: boolean;
}

export interface ReviewIssue {
  id: string;                  // "issue-1", "issue-2"
  issue_type:
    | "grade_fit"
    | "structure"
    | "source"
    | "consistency"
    | "engagement"
    | "demo"
    | "assessment"
    | "gap";
  severity: "must_fix" | "should_fix" | "nice_to_fix";
  where: string;               // JSON-path-ish: "lesson_steps[2]" or "assessment.questions[0]"
  problem: string;             // one sentence
  fix: string;                 // concrete suggested rewrite
}
```

### 2.6 Runtime State (Database Mirror)

```typescript
/**
 * The LessonRun row as returned by the API, matching prisma/schema.prisma.
 * This is what the frontend consumes via /api/lesson/[id].
 */
export interface LessonRun {
  id: string;                  // uuid
  createdAt: string;           // ISO8601
  updatedAt: string;
  status:
    | "pending"
    | "building"
    | "reviewing"
    | "packaging"
    | "complete"
    | "failed";

  // Input
  topic: string;
  gradeLevel: string;
  classLength: number | null;
  subject: string | null;
  objective: string | null;
  notes: string | null;
  sourceUploadId: string | null;

  // Phase outputs (JSON in DB; typed here)
  hunterBuild: PersonaScaffold | null;
  christineBuild: PersonaScaffold | null;
  review: ReviewReport | null;
  hunterPackage: PersonaScaffold | null;
  christinePackage: PersonaScaffold | null;
  finalPackage: LessonPackage | null;

  // Observability
  timings: PhaseTimings | null;
  tokenUsage: TokenUsage | null;
  errorLog: ErrorEntry[] | null;

  // TTL
  expiresAt: string;
}

export interface PhaseTimings {
  build_ms: number;
  build_hunter_ms: number;
  build_christine_ms: number;
  review_ms: number;
  package_ms: number;
  package_hunter_ms: number;
  package_christine_ms: number;
  total_ms: number;
}

export interface TokenUsage {
  total_in: number;
  total_out: number;
  by_phase: {
    build_hunter: { in: number; out: number };
    build_christine: { in: number; out: number };
    review: { in: number; out: number };
    package_hunter: { in: number; out: number };
    package_christine: { in: number; out: number };
  };
}

export interface ErrorEntry {
  phase: "build" | "review" | "package" | "merge" | "validation";
  persona: "hunter" | "christine" | "review" | null;
  error_code: string;          // "GEMMA_TIMEOUT" | "SCHEMA_INVALID" | "RATE_LIMIT"
  error_message: string;       // human readable
  recoverable: boolean;
  retry_attempted: boolean;
  timestamp: string;           // ISO8601
}
```

---

## 3. Zod Validators

`lib/validators.ts` — runtime-checked versions of every type above. The
orchestrator uses these to validate tool-call output before persisting.

```typescript
// lib/validators.ts
import { z } from "zod";

export const SourceOriginSchema = z.enum([
  "grounded",
  "scaffolded",
  "generated",
  "not_applicable",
]);

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

export const AssessmentQuestionSchema = z.object({
  id: z.string().regex(/^q\d+$/),
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

// The big one
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

// Cross-field invariants checked separately after Zod parse:
export function validateInvariants(pkg: LessonPackage): string[] {
  const errors: string[] = [];

  // Lesson step minutes should sum within ±5 min of estimated_minutes
  const stepMinutesSum = pkg.lesson_steps.reduce((a, s) => a + s.minutes, 0);
  if (Math.abs(stepMinutesSum - pkg.estimated_minutes) > 5) {
    errors.push(
      `Sum of lesson_steps minutes (${stepMinutesSum}) differs from estimated_minutes (${pkg.estimated_minutes}) by more than 5.`
    );
  }

  // Assessment question IDs are unique
  const qIds = pkg.assessment.questions.map((q) => q.id);
  if (new Set(qIds).size !== qIds.length) {
    errors.push("Assessment question IDs must be unique.");
  }

  // source_summary counts should match actual content
  const countGrounded = (items: { source_origin: SourceOrigin }[]) =>
    items.filter((i) => i.source_origin === "grounded").length;
  const actualGrounded = [
    ...pkg.lesson_steps,
    pkg.engagement,
    ...(pkg.demo ? [pkg.demo] : []),
    ...pkg.assessment.questions,
  ].reduce((a, s) => a + (s.source_origin === "grounded" ? 1 : 0), 0);
  if (actualGrounded !== pkg.source_summary.grounded_section_count) {
    errors.push(
      `source_summary.grounded_section_count (${pkg.source_summary.grounded_section_count}) != actual grounded count (${actualGrounded}).`
    );
  }

  return errors;
}

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
  issues: z.array(
    z.object({
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
    })
  ),
  must_fix_count: z.number().int().nonnegative(),
  should_fix_count: z.number().int().nonnegative(),
  nice_to_fix_count: z.number().int().nonnegative(),
  ready_for_packaging: z.boolean(),
});
```

---

## 4. Validation + Retry Strategy

```typescript
// lib/orchestrator.ts (relevant excerpt)

async function callPersonaWithValidation<T>(args: {
  systemPrompt: string;
  userPrompt: string;
  tool: FunctionDeclaration;
  schema: z.ZodSchema<T>;
  maxRetries?: number;
}): Promise<T> {
  const { systemPrompt, userPrompt, tool, schema, maxRetries = 1 } = args;

  let lastError: string | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const extraPrompt = lastError
      ? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION:\n${lastError}\n\nRe-emit with correct schema.`
      : "";

    const response = await callGemma({
      systemPrompt: systemPrompt + extraPrompt,
      userPrompt,
      tools: [tool],
      toolChoice: tool.name,
    });

    const rawArgs = response.tool_calls?.[0]?.arguments;
    if (!rawArgs) {
      lastError = `Model did not emit a tool call. Response: ${JSON.stringify(response.content?.slice(0, 200))}`;
      continue;
    }

    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      lastError = parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      continue;
    }

    return parsed.data;
  }

  throw new Error(`Validation failed after ${maxRetries + 1} attempts:\n${lastError}`);
}
```

**Retry policy:**
- **1 retry on validation failure.** Any more and we're fighting a
  systemic issue, not a hiccup. Log the error + surface to the UI.
- **3 retries on transient errors** (rate limit, network, 500) with
  exponential backoff (500ms, 1.5s, 4.5s).
- **No retry on policy errors** (content moderation rejections) — those
  are intentional and the UI shows the user a message.

---

## 5. Complete Example — Photosynthesis 5th Grade

```json
{
  "schema_version": "1.0",
  "title": "Photosynthesis: How Plants Make Their Own Food (And Ours)",
  "objective": "Students will identify the three inputs of photosynthesis (sunlight, water, carbon dioxide) and the two outputs (glucose, oxygen), and explain why plants matter for the air we breathe.",
  "grade_level": "5th grade",
  "subject": "Science",
  "estimated_minutes": 45,
  "overview": "Students learn that plants make their own food through photosynthesis, a process that uses sunlight, water, and carbon dioxide to produce glucose and oxygen. The lesson builds from a warm-up observation through guided note-taking, a live demonstration showing the plant releasing water vapor, and ends with an exit ticket connecting photosynthesis to the air students breathe.",
  "materials": [
    { "name": "potted plant (any leafy houseplant)", "quantity": "1", "source_origin": "scaffolded" },
    { "name": "clear plastic sandwich bag", "quantity": "1", "source_origin": "scaffolded" },
    { "name": "twist tie or tape", "quantity": "1", "source_origin": "scaffolded" },
    { "name": "photosynthesis diagram handout", "quantity": "24", "source_origin": "scaffolded" },
    { "name": "colored pencils (green, yellow, blue)", "quantity": "one set per pair", "source_origin": "scaffolded" },
    { "name": "exit ticket slips", "quantity": "24", "source_origin": "scaffolded" }
  ],
  "lesson_steps": [
    {
      "step": 1, "minutes": 5,
      "teacher_action": "Hold up the plant. Ask: 'If I forgot to water this for a month, what would happen?' Let students picture it. Then: 'What if I put it in a closet with no light for a month — same problem, or different problem?'",
      "student_action": "Respond verbally. Some will say 'it dies' for both — press them to explain WHY each one kills the plant.",
      "source_origin": "generated"
    },
    {
      "step": 2, "minutes": 10,
      "teacher_action": "Introduce 'photosynthesis' and write the equation in plain language: sunlight + water + CO2 → glucose + oxygen. Emphasize: 'Plants make their own food. They don't go to the grocery store.'",
      "student_action": "Copy the equation onto the diagram handout. Color inputs and outputs.",
      "source_origin": "scaffolded"
    },
    {
      "step": 3, "minutes": 8,
      "teacher_action": "Demonstrate: seal the plastic bag around one leaf. Explain students will check it at the end.",
      "student_action": "Watch demo. Predict what they'll see.",
      "source_origin": "scaffolded"
    },
    {
      "step": 4, "minutes": 12,
      "teacher_action": "Pair students. Each pair fills a 3-column chart: INPUT | SOURCE | WHY NEEDED. Circulate.",
      "student_action": "Work with partner to complete chart.",
      "source_origin": "scaffolded"
    },
    {
      "step": 5, "minutes": 5,
      "teacher_action": "Reveal the bag. Ask: 'What do you see? What does that tell us?'",
      "student_action": "Observe condensation. Discuss what it proves.",
      "source_origin": "scaffolded"
    },
    {
      "step": 6, "minutes": 5,
      "teacher_action": "Distribute exit tickets. Students complete individually.",
      "student_action": "Complete the exit ticket.",
      "source_origin": "scaffolded"
    }
  ],
  "engagement": {
    "type": "discussion",
    "prompt": "If plants make their own food out of sunlight, water, and air... why do farmers still need to water crops? Talk to your partner for 90 seconds.",
    "minutes": 5,
    "source_origin": "generated"
  },
  "demo": {
    "description": "Seal a plastic bag around one leaf at the start of class. By the end, students see water droplets forming — physical evidence the plant is releasing water vapor from photosynthesis.",
    "materials_needed": ["clear plastic sandwich bag", "twist tie", "live plant"],
    "teacher_tip": "If time allows, do the demo on two plants — one in sunlight, one covered with a box. The covered plant produces less condensation. Evidence that light matters.",
    "safety_notes": null,
    "source_origin": "generated"
  },
  "guided_practice": {
    "description": "Students work in pairs to complete the 3-column INPUT/SOURCE/WHY NEEDED chart while the teacher circulates and checks understanding.",
    "format": "pair",
    "duration_minutes": 12,
    "source_origin": "scaffolded"
  },
  "independent_practice": null,
  "assessment": {
    "format": "exit_ticket",
    "questions": [
      {
        "id": "q1",
        "question": "Name the three things a plant needs for photosynthesis.",
        "expected_answer": "Sunlight, water, carbon dioxide.",
        "rubric_notes": "Full credit for all three. 2/3 for any two.",
        "source_origin": "scaffolded"
      },
      {
        "id": "q2",
        "question": "Name the two things photosynthesis produces.",
        "expected_answer": "Glucose (sugar/food) and oxygen.",
        "rubric_notes": null,
        "source_origin": "scaffolded"
      },
      {
        "id": "q3",
        "question": "What did the water drops in the plastic bag prove?",
        "expected_answer": "The plant was releasing water vapor, which means it was actively doing photosynthesis.",
        "rubric_notes": "Credit any answer that connects the condensation to plant activity.",
        "source_origin": "generated"
      }
    ],
    "estimated_minutes": 5
  },
  "teacher_notes": "5th graders often think plants 'eat' dirt or water. The key move is the sentence 'plants build their own food out of air, water, and sunlight.' Slow down at that moment. For struggling learners, keep the diagram on the board throughout. For advanced learners, ask what happens to plants at night.",
  "discussion_prompts": [
    { "prompt": "If plants make their own food, why do we fertilize them?", "purpose": "deepen_understanding", "source_origin": "generated" },
    { "prompt": "Could a plant survive on Mars?", "purpose": "extend_beyond_lesson", "source_origin": "generated" },
    { "prompt": "Why are rainforests called the 'lungs of the Earth'?", "purpose": "extend_beyond_lesson", "source_origin": "generated" }
  ],
  "vocabulary": [
    { "term": "photosynthesis", "definition": "The process plants use to make food from sunlight, water, and carbon dioxide.", "example": "Every green leaf is doing photosynthesis right now.", "source_origin": "scaffolded" },
    { "term": "glucose", "definition": "A type of sugar that plants make and use as food.", "example": null, "source_origin": "scaffolded" },
    { "term": "carbon dioxide", "definition": "A gas in the air that plants take in through their leaves.", "example": "We breathe it out; plants breathe it in.", "source_origin": "scaffolded" }
  ],
  "misconceptions": [
    { "misconception": "Plants eat dirt.", "correction": "Plants absorb minerals from soil, but minerals are not food. Plants build their own food via photosynthesis.", "how_to_address": "If a student says this, ask: 'What would happen if we put a plant in nutrient-rich soil in a closet with no light?' Then walk them through why it would still die." }
  ],
  "differentiation": {
    "struggling": "Pair with a strong partner for the chart. Provide a word bank (sunlight, water, CO2, glucose, oxygen). Keep the diagram visible throughout the lesson.",
    "advanced": "Ask: 'If photosynthesis needs sunlight, how does a tree survive winter when days are short?' Let them hypothesize before explaining stored glucose.",
    "multilingual_learners": "Provide diagram labels in student's home language where possible. The visual equation transcends language.",
    "source_origin": "generated"
  },
  "homework": null,
  "enrichment": null,
  "standards_alignment": null,
  "generated_by": {
    "hunter_contribution_ids": ["build-hunter-8a3f", "package-hunter-4c12"],
    "christine_contribution_ids": ["build-christine-b7e1", "package-christine-9d4a"],
    "review_id": "review-2f8a"
  },
  "source_summary": {
    "source_id": null,
    "overall_grounding": "no_source",
    "grounded_section_count": 0,
    "generated_section_count": 5
  }
}
```

---

## 6. Tool-Call Declarations

Gemma 4 enforces the top level of this schema at generation time via
function declarations. See `PROMPTS.md §7` for the full declarations; the
TypeScript types in this document are the canonical reference that those
declarations mirror.

---

## 7. Prisma Schema Alignment

`prisma/schema.prisma` stores the structured outputs as `Json` columns:

```prisma
model LessonRun {
  // ...
  hunterBuild      Json?  // typed as PersonaScaffold in application code
  christineBuild   Json?  // typed as PersonaScaffold
  review           Json?  // typed as ReviewReport
  hunterPackage    Json?  // typed as PersonaScaffold
  christinePackage Json?  // typed as PersonaScaffold
  finalPackage     Json?  // typed as LessonPackage
  // ...
}
```

On read, the API route parses through Zod:

```typescript
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const run = await prisma.lessonRun.findUniqueOrThrow({ where: { id: params.id } });
  const finalPackage = run.finalPackage
    ? LessonPackageSchema.parse(run.finalPackage)
    : null;
  // ...
}
```

This means: the database can never return malformed output to the
frontend. If somehow bad JSON got stored (corruption, migration bug),
the API throws rather than silently passing junk to the UI.

---

## 8. Schema Versioning

- Every `LessonPackage` stores `schema_version: "1.0"`
- If we ever need to change the shape breakingly, bump to `"2.0"` and
  write a migration that converts `"1.0"` rows on demand OR lazily on
  read
- The UI renders based on `schema_version`; we can support multiple
  versions simultaneously if needed

For MVP, we stay on `"1.0"`. No one else consumes this API yet.

---

## 9. Future Extensions (Not in v1.0)

These would bump to schema `"2.0"`:

- Multi-day lesson sequences (`LessonPackage` → `LessonUnit` containing
  multiple daily packages)
- Image / media attachments (`LessonPackage.media[]` with uploaded
  teacher files)
- Collaborative editing history (`LessonPackage.revisions[]`)
- Standards auto-alignment with confidence scores on each step
- Per-student differentiation profiles

Tracked in `STRETCH.md`, not scoped to the hackathon submission.

---

## 10. Summary

| Layer | File | Purpose |
|---|---|---|
| Types | `lib/types.ts` | TypeScript interfaces for every shape |
| Validators | `lib/validators.ts` | Zod schemas, runtime-checked |
| Cross-field | `validateInvariants()` | time sum, ID uniqueness, source count consistency |
| Retry loop | `callPersonaWithValidation()` | 1 retry on validation failure, 3 on transient |
| Storage | `prisma/schema.prisma` | JSON columns mirror the types |
| API boundary | `/api/lesson/[id]/route.ts` | re-parse through Zod on read |

**The schema is the contract.** Gemma 4's tool-calling output must
satisfy it, Prisma stores it, the frontend consumes it, downloads
serialize it. Every bug in lesson output can be traced to exactly one
of: (a) model emitted wrong JSON, (b) schema allowed something we
didn't want, (c) UI rendered the schema's valid output badly. No fourth
category. That's the value of a tight contract.
