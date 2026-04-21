/**
 * TLC — Function declarations for Gemma 4 tool-calling.
 *
 * These schemas live in Google AI Studio's function-calling format and
 * are passed as `tools` on every generateContent call. Gemma 4 emits
 * JSON conforming to the schema via `tool_choice` specified at call
 * site.
 *
 * Note: we define the schemas in two representations:
 *   1. As a plain JSON-schema object (for Google AI Studio's API)
 *   2. Implicitly via `lib/validators.ts` (Zod schemas for runtime validation)
 *
 * The two must agree. CI runs a compatibility test asserting Zod
 * parses sample JSON that matches these function declarations.
 */

/**
 * The Google AI Studio SDK's FunctionDeclaration type — declared here
 * as a minimal interface so we don't take a runtime dep on the SDK
 * just for types.
 */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ──────────────────────────────────────────────────────────────────────
// SCAFFOLD — used in Phase 1 (Build) by Hunter and Christine
// ──────────────────────────────────────────────────────────────────────

const SOURCE_ORIGIN_PROP = {
  type: "string",
  enum: ["grounded", "scaffolded", "generated", "not_applicable"],
  description:
    "How this content relates to teacher source material. REQUIRED.",
};

const LESSON_STEP_PROP = {
  type: "object",
  properties: {
    step: { type: "integer", description: "1-indexed step number" },
    minutes: { type: "integer", description: "Duration in minutes" },
    teacher_action: { type: "string" },
    student_action: { type: "string" },
    source_origin: SOURCE_ORIGIN_PROP,
  },
  required: ["step", "minutes", "teacher_action", "student_action", "source_origin"],
};

const ENGAGEMENT_PROP = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: [
        "warm_up",
        "discussion",
        "partner_activity",
        "quick_check",
        "interactive_prompt",
      ],
    },
    prompt: { type: "string" },
    minutes: { type: "integer" },
    source_origin: SOURCE_ORIGIN_PROP,
  },
  required: ["type", "prompt", "minutes", "source_origin"],
};

const ASSESSMENT_PROP = {
  type: "object",
  properties: {
    format: {
      type: "string",
      enum: [
        "exit_ticket",
        "quiz",
        "worksheet",
        "comprehension_check",
        "written_response",
      ],
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: 'Stable ID like "q1", "q2" — used for answer key lookup',
          },
          question: { type: "string" },
          expected_answer: { type: "string" },
          rubric_notes: { type: "string", nullable: true },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["id", "question", "expected_answer", "source_origin"],
      },
      minItems: 1,
    },
    estimated_minutes: { type: "integer" },
  },
  required: ["format", "questions", "estimated_minutes"],
};

export const SCAFFOLD_TOOL: FunctionDeclaration = {
  name: "emit_lesson_scaffold",
  description:
    "Emit the initial lesson scaffold during the Build phase. Hunter fills structure fields; Christine fills depth fields. Both emit the same schema but focus on their ownership area.",
  parameters: {
    type: "object",
    properties: {
      persona: { type: "string", enum: ["hunter", "christine"] },
      title: { type: "string" },
      objective: { type: "string" },
      grade_level: { type: "string" },
      estimated_minutes: { type: "integer" },
      overview: { type: "string" },
      materials: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "string", nullable: true },
            source_origin: SOURCE_ORIGIN_PROP,
          },
          required: ["name", "source_origin"],
        },
      },
      lesson_steps: { type: "array", items: LESSON_STEP_PROP },
      engagement: ENGAGEMENT_PROP,
      demo: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          materials_needed: { type: "array", items: { type: "string" } },
          teacher_tip: { type: "string", nullable: true },
          safety_notes: { type: "string", nullable: true },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["description", "materials_needed", "source_origin"],
      },
      assessment: ASSESSMENT_PROP,
      teacher_notes: { type: "string", nullable: true },
      discussion_prompts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            purpose: {
              type: "string",
              enum: [
                "activate_prior_knowledge",
                "deepen_understanding",
                "extend_beyond_lesson",
                "check_misconception",
              ],
            },
            source_origin: SOURCE_ORIGIN_PROP,
          },
          required: ["prompt", "purpose", "source_origin"],
        },
      },
      vocabulary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            definition: { type: "string" },
            example: { type: "string", nullable: true },
            source_origin: SOURCE_ORIGIN_PROP,
          },
          required: ["term", "definition", "source_origin"],
        },
      },
      misconceptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            misconception: { type: "string" },
            correction: { type: "string" },
            how_to_address: { type: "string" },
          },
          required: ["misconception", "correction", "how_to_address"],
        },
      },
      handoff_notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            reason: {
              type: "string",
              enum: ["partner_owns", "insufficient_context", "out_of_scope"],
            },
            note: { type: "string", nullable: true },
          },
          required: ["field", "reason"],
        },
      },
    },
    required: [
      "persona",
      "title",
      "objective",
      "grade_level",
      "estimated_minutes",
      "overview",
      "materials",
      "lesson_steps",
      "engagement",
      "assessment",
      "discussion_prompts",
      "vocabulary",
      "misconceptions",
      "handoff_notes",
    ],
  },
};

// ──────────────────────────────────────────────────────────────────────
// REVIEW — used in Phase 2
// ──────────────────────────────────────────────────────────────────────

export const REVIEW_TOOL: FunctionDeclaration = {
  name: "emit_lesson_review",
  description:
    "Emit a structured audit of Hunter's and Christine's Phase 1 scaffolds. Flag concrete issues with severity. Propose fixes. Determine readiness for packaging.",
  parameters: {
    type: "object",
    properties: {
      overall_assessment: {
        type: "string",
        enum: ["strong_first_pass", "needs_revision", "must_regenerate"],
      },
      grade_fit: {
        type: "object",
        properties: {
          rating: {
            type: "string",
            enum: ["appropriate", "too_advanced", "too_basic"],
          },
          notes: { type: "string", nullable: true },
        },
        required: ["rating"],
      },
      source_alignment: {
        type: "string",
        enum: [
          "fully_grounded",
          "partially_grounded",
          "minimal_source_use",
          "not_applicable",
        ],
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: 'Like "issue-1", "issue-2"',
            },
            issue_type: {
              type: "string",
              enum: [
                "grade_fit",
                "structure",
                "source",
                "consistency",
                "engagement",
                "demo",
                "assessment",
                "gap",
              ],
            },
            severity: {
              type: "string",
              enum: ["must_fix", "should_fix", "nice_to_fix"],
            },
            where: {
              type: "string",
              description:
                'Pseudo-path into the scaffold, e.g. "assessment.questions[0]"',
            },
            problem: { type: "string" },
            fix: { type: "string" },
          },
          required: ["id", "issue_type", "severity", "where", "problem", "fix"],
        },
      },
      must_fix_count: { type: "integer" },
      should_fix_count: { type: "integer" },
      nice_to_fix_count: { type: "integer" },
      ready_for_packaging: { type: "boolean" },
    },
    required: [
      "overall_assessment",
      "grade_fit",
      "source_alignment",
      "issues",
      "must_fix_count",
      "should_fix_count",
      "nice_to_fix_count",
      "ready_for_packaging",
    ],
  },
};

// ──────────────────────────────────────────────────────────────────────
// PACKAGE — used in Phase 3 (final output per persona)
// ──────────────────────────────────────────────────────────────────────

export const PACKAGE_TOOL: FunctionDeclaration = {
  name: "emit_lesson_package",
  description:
    "Emit the finalized lesson contribution for the Package phase. Applies review findings. Adds optional sections if teacher requested them.",
  parameters: {
    type: "object",
    properties: {
      ...SCAFFOLD_TOOL.parameters.properties,
      // Package adds optional fields beyond scaffold:
      differentiation: {
        type: "object",
        nullable: true,
        properties: {
          struggling: { type: "string" },
          advanced: { type: "string" },
          multilingual_learners: { type: "string", nullable: true },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["struggling", "advanced", "source_origin"],
      },
      accommodations: {
        type: "object",
        nullable: true,
        description:
          "Specific supports for students with disabilities (IEP/504 accommodations). Distinct from differentiation — these target barriers tied to vision, hearing, motor, cognitive, or behavioral disabilities. Any category may be null if no specific supports are needed for this lesson.",
        properties: {
          visual_supports: {
            type: "string",
            nullable: true,
            description: "Supports for blindness, low vision, or dyslexia (e.g. large-print handouts, high-contrast visuals, screen reader compatibility, tactile manipulatives).",
          },
          auditory_supports: {
            type: "string",
            nullable: true,
            description: "Supports for deafness, hard-of-hearing, or auditory processing (e.g. written instructions alongside oral, visual cue for transitions, FM system compatibility).",
          },
          motor_supports: {
            type: "string",
            nullable: true,
            description: "Supports for mobility or fine motor challenges (e.g. larger grips on materials, seated partner work, allow voice-dictation for written response).",
          },
          cognitive_supports: {
            type: "string",
            nullable: true,
            description: "Supports for autism, ADHD, learning disabilities, or executive function needs (e.g. pre-teach vocabulary, chunk steps, provide a written procedure, allow extended time).",
          },
          behavioral_supports: {
            type: "string",
            nullable: true,
            description: "Supports for emotional regulation or anxiety (e.g. provide a fidget tool, allow a 2-minute reset break, offer to participate via written response).",
          },
          general_notes: {
            type: "string",
            nullable: true,
            description: "Catch-all: classroom environment, peer supports, or other accommodations that don't fit a single category.",
          },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["source_origin"],
      },
      homework: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          estimated_minutes: { type: "integer" },
          optional: { type: "boolean" },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["description", "estimated_minutes", "optional", "source_origin"],
      },
      enrichment: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          for_students_who: { type: "string" },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["description", "for_students_who", "source_origin"],
      },
      guided_practice: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          format: {
            type: "string",
            enum: ["whole_class", "pair", "small_group"],
          },
          duration_minutes: { type: "integer" },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["description", "format", "duration_minutes", "source_origin"],
      },
      independent_practice: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          duration_minutes: { type: "integer" },
          deliverable: { type: "string", nullable: true },
          source_origin: SOURCE_ORIGIN_PROP,
        },
        required: ["description", "duration_minutes", "source_origin"],
      },
    },
    required: SCAFFOLD_TOOL.parameters.required,
  },
};
