/**
 * TLC orchestrator — runs the 3-phase Build → Review → Package flow.
 *
 * Fire-and-forget from /api/lesson/create. The run persists all phase
 * outputs to Postgres as they complete, and emits SSE events via the
 * in-process event bus for listeners on the same instance.
 *
 * Error policy: any failure short-circuits the run with status="failed"
 * and writes a structured error entry to LessonRun.errorLog. We never
 * silently fall back to a different model or fake output.
 */

import { prisma } from "./prisma";
import { callGemma } from "./gemma";
import { emitRunEvent, finalizeRun } from "./events";
import {
  HUNTER_SYSTEM_PROMPT,
  CHRISTINE_SYSTEM_PROMPT,
  REVIEW_SYSTEM_PROMPT,
  PHASE_1_BUILD_ADDENDUM,
  PHASE_3_PACKAGE_ADDENDUM,
  buildContext,
  buildReviewContext,
  buildPhase3Context,
  buildRetryAddendum,
  type ContextInput,
} from "./personas";
import { SCAFFOLD_TOOL, PACKAGE_TOOL, REVIEW_TOOL } from "./tools";
import {
  PersonaScaffoldSchema,
  PersonaScaffoldDeltaSchema,
  ReviewReportSchema,
  LessonPackageSchema,
  validateInvariants,
} from "./validators";
import { mergePackages, type PackagePhaseExtended } from "./merge";
import {
  verifyLesson,
  verificationToReviewIssues,
  extendWithStandardsCodes,
  contradictedSourceExcerpts,
} from "./verify";
import type {
  ErrorEntry,
  LessonPackage,
  PersonaScaffold,
  PersonaScaffoldDelta,
  PhaseTimings,
  ReviewReport,
  RunStatus,
  StreamEvent,
  TokenUsage,
} from "./types";

// ──────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────

export interface OrchestrateOptions {
  /** Supplied by the create route; orchestrator starts with a persisted row. */
  runId: string;
}

export async function orchestrate({ runId }: OrchestrateOptions): Promise<void> {
  const run = await prisma.lessonRun.findUnique({ where: { id: runId } });
  if (!run) {
    throw new Error(`orchestrate: run ${runId} not found`);
  }

  const sourceText = await loadSourceText(run.sourceUploadId);
  const rawOptions =
    (run as unknown as { optionsRequested?: Record<string, boolean> })
      .optionsRequested ?? null;
  const ctxInput: ContextInput = {
    topic: run.topic,
    gradeLevel: run.gradeLevel,
    classLength: run.classLength,
    subject: run.subject,
    objective: run.objective,
    notes: run.notes,
    sourceText,
    options: rawOptions ?? undefined,
  };
  const baseContext = buildContext(ctxInput);

  const startedAt = Date.now();
  const timings: Partial<PhaseTimings> = {};
  const usage: TokenUsage = emptyUsage();

  try {
    // ─── Phase 1: Build ──────────────────────────────────────────────
    await setStatus(runId, "building");
    emit(runId, "phase_start", { phase: "building" });

    const buildStart = Date.now();
    const [hunterBuild, christineBuild] = await Promise.all([
      runPersona({
        runId,
        persona: "hunter",
        systemPrompt: HUNTER_SYSTEM_PROMPT + PHASE_1_BUILD_ADDENDUM,
        userPrompt: baseContext,
        tool: SCAFFOLD_TOOL,
        usage,
      }),
      runPersona({
        runId,
        persona: "christine",
        systemPrompt: CHRISTINE_SYSTEM_PROMPT + PHASE_1_BUILD_ADDENDUM,
        userPrompt: baseContext,
        tool: SCAFFOLD_TOOL,
        usage,
      }),
    ]);
    timings.build_ms = Date.now() - buildStart;
    timings.build_hunter_ms = hunterBuild.latencyMs;
    timings.build_christine_ms = christineBuild.latencyMs;

    await prisma.lessonRun.update({
      where: { id: runId },
      data: {
        hunterBuild: hunterBuild.scaffold as unknown as object,
        christineBuild: christineBuild.scaffold as unknown as object,
      },
    });
    emit(runId, "hunter_complete", {
      latencyMs: hunterBuild.latencyMs,
      scaffold: hunterBuild.scaffold,
    });
    emit(runId, "christine_complete", {
      latencyMs: christineBuild.latencyMs,
      scaffold: christineBuild.scaffold,
    });

    // ─── Phase 2: Review ─────────────────────────────────────────────
    await setStatus(runId, "reviewing");
    emit(runId, "review_start", {});

    const reviewStart = Date.now();
    let review = await runReview({
      runId,
      baseContext,
      hunterBuild: hunterBuild.scaffold,
      christineBuild: christineBuild.scaffold,
      usage,
    });
    timings.review_ms = Date.now() - reviewStart;

    await prisma.lessonRun.update({
      where: { id: runId },
      data: { review: review as unknown as object },
    });
    emit(runId, "review_complete", { review });

    // ─── Regenerate-on-must-fix ─────────────────────────────────────
    // If Review flagged must-fix issues, give Build one more pass with
    // the review findings in context. Bounded to a single retry so we
    // don't loop infinitely. After regen, re-run Review on the new
    // scaffolds so Phase 3 sees the updated findings.
    let activeHunterBuild = hunterBuild;
    let activeChristineBuild = christineBuild;
    if (review.must_fix_count > 0) {
      timings.retried_due_to_must_fix = true;
      await setStatus(runId, "building");
      emit(runId, "phase_start", { phase: "building", reason: "regenerate_on_must_fix" });

      const retryStart = Date.now();
      const contradictedExcerpts = contradictedSourceExcerpts(review.verification);
      const [hunterRetry, christineRetry] = await Promise.all([
        runPersona({
          runId,
          persona: "hunter",
          systemPrompt: HUNTER_SYSTEM_PROMPT + PHASE_1_BUILD_ADDENDUM,
          userPrompt:
            baseContext +
            buildRetryAddendum({
              previousScaffold: hunterBuild.scaffold,
              partnerScaffold: christineBuild.scaffold,
              review,
              contradictedExcerpts,
            }),
          tool: SCAFFOLD_TOOL,
          usage,
        }),
        runPersona({
          runId,
          persona: "christine",
          systemPrompt: CHRISTINE_SYSTEM_PROMPT + PHASE_1_BUILD_ADDENDUM,
          userPrompt:
            baseContext +
            buildRetryAddendum({
              previousScaffold: christineBuild.scaffold,
              partnerScaffold: hunterBuild.scaffold,
              review,
              contradictedExcerpts,
            }),
          tool: SCAFFOLD_TOOL,
          usage,
        }),
      ]);
      timings.build_retry_ms = Date.now() - retryStart;

      activeHunterBuild = hunterRetry;
      activeChristineBuild = christineRetry;

      await prisma.lessonRun.update({
        where: { id: runId },
        data: {
          hunterBuild: hunterRetry.scaffold as unknown as object,
          christineBuild: christineRetry.scaffold as unknown as object,
        },
      });
      emit(runId, "hunter_complete", {
        latencyMs: hunterRetry.latencyMs,
        scaffold: hunterRetry.scaffold,
        retry: true,
      });
      emit(runId, "christine_complete", {
        latencyMs: christineRetry.latencyMs,
        scaffold: christineRetry.scaffold,
        retry: true,
      });

      // Re-run Review on the regenerated scaffolds.
      await setStatus(runId, "reviewing");
      emit(runId, "review_start", { retry: true });
      const reviewRetryStart = Date.now();
      review = await runReview({
        runId,
        baseContext,
        hunterBuild: hunterRetry.scaffold,
        christineBuild: christineRetry.scaffold,
        usage,
      });
      timings.review_retry_ms = Date.now() - reviewRetryStart;
      await prisma.lessonRun.update({
        where: { id: runId },
        data: { review: review as unknown as object },
      });
      emit(runId, "review_complete", { review, retry: true });
    }

    // ─── Phase 3: Package ────────────────────────────────────────────
    await setStatus(runId, "packaging");
    emit(runId, "phase_start", { phase: "packaging" });

    const packageStart = Date.now();
    const hunterPhase3Context = buildPhase3Context({
      baseContext,
      ownPersona: "hunter",
      ownBuild: activeHunterBuild.scaffold,
      partnerBuild: activeChristineBuild.scaffold,
      review,
    });
    const christinePhase3Context = buildPhase3Context({
      baseContext,
      ownPersona: "christine",
      ownBuild: activeChristineBuild.scaffold,
      partnerBuild: activeHunterBuild.scaffold,
      review,
    });

    const [hunterDelta, christineDelta] = await Promise.all([
      runPersonaDelta({
        runId,
        persona: "hunter",
        systemPrompt: HUNTER_SYSTEM_PROMPT + PHASE_3_PACKAGE_ADDENDUM,
        userPrompt: hunterPhase3Context,
        tool: PACKAGE_TOOL,
        usage,
      }),
      runPersonaDelta({
        runId,
        persona: "christine",
        systemPrompt: CHRISTINE_SYSTEM_PROMPT + PHASE_3_PACKAGE_ADDENDUM,
        userPrompt: christinePhase3Context,
        tool: PACKAGE_TOOL,
        usage,
      }),
    ]);
    timings.package_ms = Date.now() - packageStart;
    timings.package_hunter_ms = hunterDelta.latencyMs;
    timings.package_christine_ms = christineDelta.latencyMs;

    // Apply each delta on top of its (post-retry, if any) Phase 1 scaffold
    // to produce the effective Phase 3 scaffold that the merge layer consumes.
    const hunterPackage = applyDelta(activeHunterBuild.scaffold, hunterDelta.delta);
    const christinePackage = applyDelta(
      activeChristineBuild.scaffold,
      christineDelta.delta,
    );

    const finalPackage = mergeAndValidate({
      runId,
      hunterPackage,
      christinePackage,
      hunterPackageExtended: hunterDelta.extended,
      christinePackageExtended: christineDelta.extended,
      review,
      sourceId: run.sourceUploadId,
      subject: run.subject,
    });

    // Post-merge: validate any cited standards codes against published
    // formats and extend the verification report. Standards alignment
    // doesn't exist until Phase 3, so this is the first chance to check.
    review.verification = extendWithStandardsCodes(
      review.verification,
      finalPackage.standards_alignment,
    );

    timings.total_ms = Date.now() - startedAt;

    await prisma.lessonRun.update({
      where: { id: runId },
      data: {
        status: "complete" satisfies RunStatus,
        hunterPackage: hunterPackage as unknown as object,
        christinePackage: christinePackage as unknown as object,
        finalPackage: finalPackage as unknown as object,
        review: review as unknown as object,
        timings: timings as unknown as object,
        tokenUsage: usage as unknown as object,
      },
    });
    emit(runId, "package_ready", { finalPackage, timings });
  } catch (err) {
    await recordFailure(runId, err);
  } finally {
    finalizeRun(runId);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase helpers
// ──────────────────────────────────────────────────────────────────────

interface PersonaRunArgs {
  runId: string;
  persona: "hunter" | "christine";
  systemPrompt: string;
  userPrompt: string;
  tool: typeof SCAFFOLD_TOOL | typeof PACKAGE_TOOL;
  usage: TokenUsage;
  /** "build" (default) or "package" — determines which usage bucket we fill. */
  phase?: "build" | "package";
}

interface PersonaRunResult {
  scaffold: PersonaScaffold;
  extended: PackagePhaseExtended | null;
  latencyMs: number;
}

// Maximum attempts per persona before runPersona surrenders (and the
// orchestrator can try cross-fill from the sibling persona). Each attempt
// after the first uses progressively sterner repair feedback in the
// user prompt.
const PERSONA_MAX_ATTEMPTS = 4;

// Loose subtype of Zod's issue shape — we only read .path / .message / .code
// and Zod's $ZodIssue has more variants than we care to enumerate here.
type RepairIssue = { path: readonly (string | number | symbol)[]; message: string; code?: string };

/**
 * Format a Zod issue list into a per-field repair instruction block.
 * Groups by top-level key so the model sees one bullet per area, not
 * one per leaf — easier to act on. Distinguishes missing fields (the
 * most important kind of error) from invalid values.
 */
function formatRepairIssues(issues: ReadonlyArray<RepairIssue>): string {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    const isMissing =
      issue.code === "invalid_type" && /received undefined/i.test(issue.message);
    if (isMissing) {
      missing.push(`  • ${path || "<root>"} — REQUIRED but you did not emit it`);
    } else {
      invalid.push(`  • ${path || "<root>"} — ${issue.message}`);
    }
  }
  const lines: string[] = [];
  if (missing.length) {
    lines.push("Missing required fields:");
    lines.push(...missing);
  }
  if (invalid.length) {
    if (missing.length) lines.push("");
    lines.push("Invalid values:");
    lines.push(...invalid);
  }
  return lines.join("\n");
}

/**
 * Build the user-prompt addendum for retry attempts. Tone escalates with
 * attempt number — by the last attempt the language is unmissable.
 */
function makeRepairAddendum(
  issues: ReadonlyArray<RepairIssue>,
  attemptNumber: number,
  maxAttempts: number,
): string {
  const final = attemptNumber === maxAttempts;
  const header = final
    ? `--- FINAL ATTEMPT (${attemptNumber}/${maxAttempts}) — STRICT MODE ---\n` +
      "Your output has been REJECTED on prior attempts. The tool schema is non-negotiable. " +
      "This is your last chance. Re-emit the COMPLETE tool call with EVERY required field present " +
      "and EVERY value matching its declared type/enum. Do not include commentary outside the tool call."
    : `--- RETRY (${attemptNumber}/${maxAttempts}) ---\n` +
      "Your previous output failed validation. Re-emit the COMPLETE tool call. " +
      "Every required field must be present. Do not omit any field.";
  return `\n\n${header}\n\n${formatRepairIssues(issues)}`;
}

async function runPersona(args: PersonaRunArgs): Promise<PersonaRunResult> {
  const phase = args.phase ?? "build";
  let lastIssues: ReadonlyArray<RepairIssue> = [];
  let totalLatency = 0;
  let userPrompt = args.userPrompt;

  for (let attempt = 1; attempt <= PERSONA_MAX_ATTEMPTS; attempt++) {
    const result = await callGemma({
      systemPrompt: args.systemPrompt,
      userPrompt,
      tool: args.tool,
      phase,
      persona: args.persona,
    });
    totalLatency += result.latencyMs;
    bumpUsage(args.usage, args.persona, phase, result.tokensIn, result.tokensOut);

    const withPersona = { persona: args.persona, ...result.toolArgs };
    const parsed = PersonaScaffoldSchema.safeParse(withPersona);
    if (parsed.success) {
      return {
        scaffold: parsed.data,
        extended: extractExtended(result.toolArgs),
        latencyMs: totalLatency,
      };
    }

    lastIssues = parsed.error.issues;
    if (attempt < PERSONA_MAX_ATTEMPTS) {
      userPrompt =
        args.userPrompt + makeRepairAddendum(lastIssues, attempt + 1, PERSONA_MAX_ATTEMPTS);
    }
  }

  throw new Error(
    `Persona ${args.persona} failed schema validation after ${PERSONA_MAX_ATTEMPTS} attempts. ` +
      `Issues: ${JSON.stringify(lastIssues).slice(0, 800)}`,
  );
}

// ──────────────────────────────────────────────────────────────────────
// Phase 3 delta helpers
// ──────────────────────────────────────────────────────────────────────

interface PersonaDeltaRunArgs {
  runId: string;
  persona: "hunter" | "christine";
  systemPrompt: string;
  userPrompt: string;
  tool: typeof PACKAGE_TOOL;
  usage: TokenUsage;
}

interface PersonaDeltaResult {
  delta: PersonaScaffoldDelta;
  extended: PackagePhaseExtended | null;
  latencyMs: number;
}

async function runPersonaDelta(args: PersonaDeltaRunArgs): Promise<PersonaDeltaResult> {
  const result = await callGemma({
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
    tool: args.tool,
    phase: "package",
    persona: args.persona,
  });

  const withPersona = { persona: args.persona, ...result.toolArgs };
  const parsed = PersonaScaffoldDeltaSchema.safeParse(withPersona);

  if (!parsed.success) {
    const retryPrompt =
      args.userPrompt +
      "\n\n--- RETRY CONTEXT ---\nYour previous delta output failed validation:\n" +
      parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n") +
      "\nRe-emit ONLY the fields you actually want to change or add. Don't re-emit fields you're leaving as-is.";
    const retry = await callGemma({
      systemPrompt: args.systemPrompt,
      userPrompt: retryPrompt,
      tool: args.tool,
      phase: "package",
      persona: args.persona,
    });
    const retryWithPersona = { persona: args.persona, ...retry.toolArgs };
    const retryParsed = PersonaScaffoldDeltaSchema.safeParse(retryWithPersona);
    if (!retryParsed.success) {
      throw new Error(
        `Persona ${args.persona} delta failed validation twice. Issues: ${JSON.stringify(retryParsed.error.issues).slice(0, 500)}`,
      );
    }
    bumpUsage(args.usage, args.persona, "package", retry.tokensIn, retry.tokensOut);
    return {
      delta: retryParsed.data as PersonaScaffoldDelta,
      extended: extractExtended(retry.toolArgs),
      latencyMs: result.latencyMs + retry.latencyMs,
    };
  }

  bumpUsage(args.usage, args.persona, "package", result.tokensIn, result.tokensOut);
  return {
    delta: parsed.data as PersonaScaffoldDelta,
    extended: extractExtended(result.toolArgs),
    latencyMs: result.latencyMs,
  };
}

/**
 * Apply a Phase 3 delta on top of a Phase 1 scaffold. Any field set on
 * the delta replaces the Build value; any field absent inherits from Build.
 * Null is treated as "explicitly unset this field" for nullable fields.
 */
function applyDelta(
  build: PersonaScaffold,
  delta: PersonaScaffoldDelta,
): PersonaScaffold {
  const effective: PersonaScaffold = { ...build };
  for (const [key, value] of Object.entries(delta)) {
    if (key === "persona") continue;
    if (value === undefined) continue;
    (effective as unknown as Record<string, unknown>)[key] = value;
  }
  return effective;
}

function extractExtended(toolArgs: Record<string, unknown>): PackagePhaseExtended | null {
  const keys = [
    "guided_practice",
    "independent_practice",
    "differentiation",
    "accommodations",
    "homework",
    "enrichment",
    "standards_alignment",
  ] as const;
  const ext: PackagePhaseExtended = {};
  let anyFound = false;
  for (const k of keys) {
    if (toolArgs[k] !== undefined && toolArgs[k] !== null) {
      // Trust the tool output here; Zod validation of extended fields
      // happens in mergeAndValidate via LessonPackageSchema.
      (ext as Record<string, unknown>)[k] = toolArgs[k];
      anyFound = true;
    }
  }
  return anyFound ? ext : null;
}

interface ReviewRunArgs {
  runId: string;
  baseContext: string;
  hunterBuild: PersonaScaffold;
  christineBuild: PersonaScaffold;
  usage: TokenUsage;
}

async function runReview(args: ReviewRunArgs): Promise<ReviewReport> {
  const userPrompt = buildReviewContext({
    baseContext: args.baseContext,
    hunterBuild: args.hunterBuild,
    christineBuild: args.christineBuild,
  });

  // Run Gemma's review and the external-source verification in parallel.
  // Verification is independent of the review prompt, so the Wikipedia
  // round trips overlap with the Gemma call.
  const [reviewResult, verification] = await Promise.all([
    callGemma({
      systemPrompt: REVIEW_SYSTEM_PROMPT,
      userPrompt,
      tool: REVIEW_TOOL,
      temperature: 0.3,
      phase: "review",
    }),
    verifyLesson({
      hunter: args.hunterBuild,
      christine: args.christineBuild,
    }).catch(() => null),
  ]);

  args.usage.by_phase.review.in += reviewResult.tokensIn;
  args.usage.by_phase.review.out += reviewResult.tokensOut;
  args.usage.total_in += reviewResult.tokensIn;
  args.usage.total_out += reviewResult.tokensOut;

  const parsed = ReviewReportSchema.safeParse(reviewResult.toolArgs);
  if (!parsed.success) {
    throw new Error(
      `Review output failed schema validation: ${JSON.stringify(parsed.error.issues).slice(0, 500)}`,
    );
  }
  const review = parsed.data;

  if (verification) {
    const verifyIssues = verificationToReviewIssues(verification);
    review.issues = [...review.issues, ...verifyIssues];
    review.must_fix_count += verifyIssues.filter(
      (i) => i.severity === "must_fix",
    ).length;
    review.should_fix_count += verifyIssues.filter(
      (i) => i.severity === "should_fix",
    ).length;
    review.nice_to_fix_count += verifyIssues.filter(
      (i) => i.severity === "nice_to_fix",
    ).length;
    review.verification = verification;
  } else {
    review.verification = null;
  }

  return review;
}

// ──────────────────────────────────────────────────────────────────────
// Merge + final validation
// ──────────────────────────────────────────────────────────────────────

interface MergeAndValidateArgs {
  runId: string;
  hunterPackage: PersonaScaffold;
  christinePackage: PersonaScaffold;
  hunterPackageExtended: PackagePhaseExtended | null;
  christinePackageExtended: PackagePhaseExtended | null;
  review: ReviewReport;
  sourceId: string | null;
  subject: string | null;
}

function mergeAndValidate(args: MergeAndValidateArgs): LessonPackage {
  const merged = mergePackages({
    runId: args.runId,
    hunterPackage: args.hunterPackage,
    christinePackage: args.christinePackage,
    review: args.review,
    sourceId: args.sourceId,
    hunterPackageExtended: args.hunterPackageExtended,
    christinePackageExtended: args.christinePackageExtended,
    optionsRequested: { differentiation: true, homework: true, enrichment: true },
  });
  // Resolve subject from the run input; merge doesn't know it.
  merged.subject = args.subject;

  const parsed = LessonPackageSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(
      `Merged lesson package failed schema validation: ${JSON.stringify(parsed.error.issues).slice(0, 500)}`,
    );
  }
  const invariantErrors = validateInvariants(parsed.data);
  if (invariantErrors.length > 0) {
    // Don't throw — invariants are soft signals. Log them into the run
    // so the judge-mode inspector can show them without breaking the
    // user-facing output.
    emitWarn(args.runId, `Invariant warnings: ${invariantErrors.join("; ")}`);
  }
  return parsed.data;
}

// ──────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────

async function loadSourceText(sourceUploadId: string | null): Promise<string | null> {
  if (!sourceUploadId) return null;
  const src = await prisma.sourceUpload.findUnique({ where: { id: sourceUploadId } });
  if (!src || src.expiresAt < new Date()) return null;
  return src.textContent ?? null;
}

async function setStatus(runId: string, status: RunStatus): Promise<void> {
  await prisma.lessonRun.update({ where: { id: runId }, data: { status } });
}

function emit(runId: string, type: StreamEvent["type"], payload: unknown): void {
  emitRunEvent(runId, {
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

function emitWarn(runId: string, message: string): void {
  emitRunEvent(runId, {
    type: "error",
    payload: { code: "invariant_warning", message, fatal: false },
    timestamp: new Date().toISOString(),
  });
}

function bumpUsage(
  usage: TokenUsage,
  persona: "hunter" | "christine",
  phase: "build" | "package",
  tokensIn: number,
  tokensOut: number,
): void {
  const key =
    phase === "build"
      ? persona === "hunter"
        ? "build_hunter"
        : "build_christine"
      : persona === "hunter"
        ? "package_hunter"
        : "package_christine";
  usage.by_phase[key].in += tokensIn;
  usage.by_phase[key].out += tokensOut;
  usage.total_in += tokensIn;
  usage.total_out += tokensOut;
}

function emptyUsage(): TokenUsage {
  return {
    total_in: 0,
    total_out: 0,
    by_phase: {
      build_hunter: { in: 0, out: 0 },
      build_christine: { in: 0, out: 0 },
      review: { in: 0, out: 0 },
      package_hunter: { in: 0, out: 0 },
      package_christine: { in: 0, out: 0 },
    },
  };
}

async function recordFailure(runId: string, err: unknown): Promise<void> {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();
  const isQuota =
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota");
  const isTimeout = lower.includes("timed out") || lower.includes("timeout");
  // Friendly user-facing message for the common transient cases; keep
  // the raw error in error_message for the judge inspector.
  const friendly = isQuota
    ? "Rate limit hit on Google AI Studio (per-minute input-token cap). The bucket resets every minute — try the same lesson again in 60–90 seconds."
    : isTimeout
      ? "A Gemma call took longer than the per-call budget. The model may be under heavy load or the inference backend is offline. Try again in a minute."
      : null;
  const message = friendly ?? rawMessage;
  const entry: ErrorEntry = {
    phase: inferPhase(rawMessage),
    persona: null,
    error_code: isQuota ? "quota_exhausted" : isTimeout ? "call_timeout" : "orchestrator_error",
    error_message: message.slice(0, 2000),
    recoverable: isQuota || isTimeout,
    retry_attempted: false,
    timestamp: new Date().toISOString(),
  };
  try {
    await prisma.lessonRun.update({
      where: { id: runId },
      data: {
        status: "failed" satisfies RunStatus,
        errorLog: [entry] as unknown as object,
      },
    });
  } catch {
    // DB unreachable — nothing more we can do.
  }
  emit(runId, "error", { code: entry.error_code, message: entry.error_message, fatal: true });
}

function inferPhase(msg: string): ErrorEntry["phase"] {
  const m = msg.toLowerCase();
  if (m.includes("review")) return "review";
  if (m.includes("package") || m.includes("merge")) return "package";
  if (m.includes("merge")) return "merge";
  if (m.includes("validat")) return "validation";
  return "build";
}
