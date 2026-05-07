/**
 * TLC — TypeScript types for structured output.
 *
 * This is the canonical shape of a lesson package. Gemma 4's tool-call
 * output must satisfy it (validated by lib/validators.ts), Prisma stores
 * it as JSON, the frontend consumes it, and downloads serialize it.
 *
 * Every bug in lesson output traces to exactly one of:
 *   (a) model emitted wrong JSON,
 *   (b) schema allowed something we didn't want,
 *   (c) UI rendered the schema's valid output badly.
 *
 * See SCHEMA.md for the full rationale.
 */

/**
 * How a given content field relates to teacher-provided source material.
 * Every content field in a lesson package carries this label.
 */
export type SourceOrigin =
  | "grounded"         // Content traces DIRECTLY to provided source material
  | "scaffolded"       // Teacher's source shaped the structure; wording is generated
  | "generated"        // Open generation; no source ties (flagged for teacher review)
  | "not_applicable";  // No teacher source was provided; label N/A

// ──────────────────────────────────────────────────────────────────────
// Lesson Package — the final, canonical output shape
// ──────────────────────────────────────────────────────────────────────

export interface LessonPackage {
  schema_version: "1.0";

  // Identity
  title: string;
  objective: string;
  grade_level: string;
  subject: string | null;
  estimated_minutes: number;

  // Structure
  overview: string;
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
  accommodations: Accommodations | null;
  homework: Homework | null;
  enrichment: Enrichment | null;
  standards_alignment: StandardsAlignment | null;

  // Provenance
  generated_by: {
    hunter_contribution_ids: string[];
    christine_contribution_ids: string[];
    review_id: string;
  };
  source_summary: {
    source_id: string | null;
    overall_grounding:
      | "fully_grounded"
      | "partially_grounded"
      | "no_source";
    grounded_section_count: number;
    generated_section_count: number;
  };
}

// ──────────────────────────────────────────────────────────────────────
// Sub-types
// ──────────────────────────────────────────────────────────────────────

export interface Material {
  name: string;
  quantity: string | null;
  source_origin: SourceOrigin;
}

export interface LessonStep {
  step: number;
  minutes: number;
  teacher_action: string;
  student_action: string;
  source_origin: SourceOrigin;
}

export type EngagementType =
  | "warm_up"
  | "discussion"
  | "partner_activity"
  | "quick_check"
  | "interactive_prompt";

export interface Engagement {
  type: EngagementType;
  prompt: string;
  minutes: number;
  source_origin: SourceOrigin;
}

export interface Demonstration {
  description: string;
  materials_needed: string[];
  teacher_tip: string | null;
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
  deliverable: string | null;
  source_origin: SourceOrigin;
}

export type AssessmentFormat =
  | "exit_ticket"
  | "quiz"
  | "worksheet"
  | "comprehension_check"
  | "written_response";

export interface Assessment {
  format: AssessmentFormat;
  questions: AssessmentQuestion[];
  estimated_minutes: number;
}

export interface AssessmentQuestion {
  id: string; // "q1", "q2"
  question: string;
  expected_answer: string;
  rubric_notes: string | null;
  source_origin: SourceOrigin;
}

export type DiscussionPromptPurpose =
  | "activate_prior_knowledge"
  | "deepen_understanding"
  | "extend_beyond_lesson"
  | "check_misconception";

export interface DiscussionPrompt {
  prompt: string;
  purpose: DiscussionPromptPurpose;
  source_origin: SourceOrigin;
}

export interface VocabularyTerm {
  term: string;
  definition: string;
  example: string | null;
  source_origin: SourceOrigin;
}

export interface Misconception {
  misconception: string;
  correction: string;
  how_to_address: string;
}

export interface Differentiation {
  struggling: string;
  advanced: string;
  multilingual_learners: string | null;
  source_origin: SourceOrigin;
}

/**
 * Accommodations for students with disabilities — distinct from
 * Differentiation, which adjusts for readiness level. Accommodations
 * remove barriers tied to a specific disability type (vision, hearing,
 * motor/physical, cognitive/attentional, behavioral/emotional). Teachers
 * usually apply these from a student's IEP or 504 plan, not per lesson,
 * but the lesson should suggest specific supports that fit this content.
 *
 * Each category is nullable; null means "no special accommodations
 * suggested for this dimension in this lesson" (not "no accommodations
 * needed for disabled students" — that's a teacher-level judgement).
 */
export interface Accommodations {
  visual_supports: string | null;        // blindness / low vision / dyslexia
  auditory_supports: string | null;      // deafness / hard of hearing / auditory processing
  motor_supports: string | null;         // mobility / fine motor / chronic pain
  cognitive_supports: string | null;     // autism / ADHD / LD / executive function
  behavioral_supports: string | null;    // emotional regulation / anxiety
  general_notes: string | null;          // catch-all: environment, classroom layout, peer supports
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
  for_students_who: string;
  source_origin: SourceOrigin;
}

export interface StandardsAlignment {
  standards_cited: StandardReference[];
  confidence: "teacher_provided" | "inferred" | "none";
  notes: string | null;
}

export interface StandardReference {
  framework: string; // "NGSS" | "Common Core Math" | "state:AZ" | ...
  code: string;      // "5-LS1-1"
  description: string;
}

// ──────────────────────────────────────────────────────────────────────
// Persona scaffold (Phase 1 / Phase 3 output from Hunter or Christine)
// ──────────────────────────────────────────────────────────────────────

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

  // Christine-owned in practice; null-allowed for both
  teacher_notes: string | null;
  discussion_prompts: DiscussionPrompt[];
  vocabulary: VocabularyTerm[];
  misconceptions: Misconception[];

  handoff_notes: HandoffNote[];
}

/**
 * Delta-shape returned by Phase 3. Every field optional except persona;
 * merge layer fills unset fields from the Phase 1 scaffold.
 */
export type PersonaScaffoldDelta = Partial<Omit<PersonaScaffold, "persona">> & {
  persona: "hunter" | "christine";
};

export interface HandoffNote {
  field: string;
  reason: "partner_owns" | "insufficient_context" | "out_of_scope";
  note: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// Review report (Phase 2 output)
// ──────────────────────────────────────────────────────────────────────

export type ReviewAssessment =
  | "strong_first_pass"
  | "needs_revision"
  | "must_regenerate";

export interface ReviewReport {
  overall_assessment: ReviewAssessment;
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
  /**
   * External-source verification — vocabulary/misconception claims
   * cross-referenced against Wikipedia. Null until Phase 2 verification
   * completes; on a fresh run this is always populated.
   */
  verification?: VerificationReport | null;
}

export type VerificationClaimKind =
  | "vocabulary"
  | "misconception"
  | "standards_code";
export type VerificationStatus = "verified" | "unverified" | "contradicted";

export interface VerificationSourceRef {
  name: string;
  url: string | null;
  excerpt: string | null;
}

export interface VerificationFinding {
  id: string;
  claim_kind: VerificationClaimKind;
  claim_subject: string;
  claim_text: string;
  status: VerificationStatus;
  sources: VerificationSourceRef[];
  notes: string | null;
}

export interface VerificationReport {
  generated_at: string;
  total_checked: number;
  verified_count: number;
  unverified_count: number;
  contradicted_count: number;
  findings: VerificationFinding[];
}

export type IssueType =
  | "grade_fit"
  | "structure"
  | "source"
  | "consistency"
  | "engagement"
  | "demo"
  | "assessment"
  | "gap";

export type IssueSeverity = "must_fix" | "should_fix" | "nice_to_fix";

export interface ReviewIssue {
  id: string;
  issue_type: IssueType;
  severity: IssueSeverity;
  where: string;
  problem: string;
  fix: string;
}

// ──────────────────────────────────────────────────────────────────────
// Runtime + API shapes
// ──────────────────────────────────────────────────────────────────────

export type RunStatus =
  | "pending"
  | "building"
  | "reviewing"
  | "packaging"
  | "complete"
  | "failed";

export interface LessonRun {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;

  topic: string;
  gradeLevel: string;
  classLength: number | null;
  subject: string | null;
  objective: string | null;
  notes: string | null;
  sourceUploadId: string | null;

  hunterBuild: PersonaScaffold | null;
  christineBuild: PersonaScaffold | null;
  review: ReviewReport | null;
  hunterPackage: PersonaScaffold | null;
  christinePackage: PersonaScaffold | null;
  finalPackage: LessonPackage | null;

  timings: PhaseTimings | null;
  tokenUsage: TokenUsage | null;
  errorLog: ErrorEntry[] | null;

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
  /** Set when regenerate-on-must-fix triggered a second Build pass. */
  build_retry_ms?: number;
  review_retry_ms?: number;
  retried_due_to_must_fix?: boolean;
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
  error_code: string;
  error_message: string;
  recoverable: boolean;
  retry_attempted: boolean;
  timestamp: string;
}

// ──────────────────────────────────────────────────────────────────────
// SSE event shapes (consumed by the frontend)
// ──────────────────────────────────────────────────────────────────────

export type StreamEventType =
  | "phase_start"
  | "hunter_token"
  | "christine_token"
  | "hunter_complete"
  | "christine_complete"
  | "review_start"
  | "review_complete"
  | "package_ready"
  | "source_anchor"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  payload: unknown; // narrowed by consumers based on type
  timestamp: string;
}

// ──────────────────────────────────────────────────────────────────────
// API request/response shapes
// ──────────────────────────────────────────────────────────────────────

export interface CreateLessonRequest {
  topic: string;
  gradeLevel: string;
  classLength?: number;
  subject?: string;
  objective?: string;
  notes?: string;
  sourceUploadId?: string;
  options?: {
    differentiation?: boolean;
    homework?: boolean;
    enrichment?: boolean;
  };
}

export interface CreateLessonResponse {
  runId: string;
}

export interface SourceUploadResponse {
  sourceId: string;
  excerptPreview: string;
  charCount: number;
  parseMethod: "text" | "markdown" | "pdf_pypdf";
  expiresAt: string;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  gemma_reachable: boolean;
  db_reachable: boolean;
  last_lesson_at: string | null;
  uptime_pct_24h: number | null;
}

export interface StatsResponse {
  lessons_created_total: number;
  lessons_created_today: number;
  tokens_in_total: string; // BigInt serialized
  tokens_out_total: string;
  avg_latency_ms: number;
  error_rate: number;
  last_updated: string;
}
