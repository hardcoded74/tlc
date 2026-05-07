/**
 * Cross-reference lesson content against trusted public sources.
 *
 * Runs as part of Phase 2 (Review). Pulls vocabulary terms and
 * misconception corrections out of the Hunter + Christine scaffolds,
 * queries Wikipedia and Wikidata for each, then asks Gemma in a single
 * batched call to flag any lesson definition that contradicts the
 * reference excerpts.
 *
 * Contradicted claims map back to the Review report as `must_fix`
 * issues so the existing regenerate-on-must-fix loop catches them.
 *
 * Sources are pluggable. Wikipedia (prose summary) and Wikidata
 * (structured one-line description) are both wired up — they
 * corroborate each other for high-signal terms, and either alone is
 * still useful when the other 404s.
 */

import { callGemma } from "./gemma";
import type { FunctionDeclaration } from "./tools";
import type { PersonaScaffold, ReviewIssue } from "./types";

const WIKIPEDIA_REST_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT =
  "TLC/1.0 (Teacher's Lesson Creator; https://github.com/hardcoded74/tlc)";
const FETCH_TIMEOUT_MS = 4000;
const MAX_PARALLEL_LOOKUPS = 6;

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export type ClaimKind = "vocabulary" | "misconception" | "standards_code";
export type ClaimStatus = "verified" | "unverified" | "contradicted";

export interface SourceRef {
  name: string;
  url: string | null;
  excerpt: string | null;
}

export interface VerificationFinding {
  id: string;
  claim_kind: ClaimKind;
  claim_subject: string;
  claim_text: string;
  status: ClaimStatus;
  sources: SourceRef[];
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

export interface VerifyOptions {
  /** Skip the Gemma contradiction pass. Default false. */
  skipContradictionCheck?: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Claim extraction
// ──────────────────────────────────────────────────────────────────────

interface Claim {
  kind: ClaimKind;
  subject: string;
  text: string;
}

function dedupe<T>(items: T[], keyOf: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = keyOf(item).toLowerCase().trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

function extractClaims(
  hunter: PersonaScaffold,
  christine: PersonaScaffold,
): Claim[] {
  const claims: Claim[] = [];

  for (const term of [...christine.vocabulary, ...hunter.vocabulary]) {
    claims.push({
      kind: "vocabulary",
      subject: term.term,
      text: term.definition,
    });
  }

  for (const m of [...christine.misconceptions, ...hunter.misconceptions]) {
    claims.push({
      kind: "misconception",
      subject: m.misconception.slice(0, 80),
      text: m.correction,
    });
  }

  return dedupe(claims, (c) => `${c.kind}:${c.subject}`);
}

// ──────────────────────────────────────────────────────────────────────
// Wikipedia lookup
// ──────────────────────────────────────────────────────────────────────

interface WikiLookupResult {
  found: boolean;
  url: string | null;
  excerpt: string | null;
  isDisambiguation: boolean;
}

async function lookupWikipedia(query: string): Promise<WikiLookupResult> {
  const title = query.trim().replace(/\s+/g, "_");
  const url = `${WIKIPEDIA_REST_BASE}/${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { found: false, url: null, excerpt: null, isDisambiguation: false };
    }
    const json = (await res.json()) as {
      type?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    const isDisambiguation = json.type === "disambiguation";
    return {
      found: !isDisambiguation && Boolean(json.extract),
      url: json.content_urls?.desktop?.page ?? null,
      excerpt: json.extract ? json.extract.slice(0, 600) : null,
      isDisambiguation,
    };
  } catch {
    return { found: false, url: null, excerpt: null, isDisambiguation: false };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Wikidata lookup
// ──────────────────────────────────────────────────────────────────────

interface WikidataLookupResult {
  found: boolean;
  url: string | null;
  excerpt: string | null;
}

async function lookupWikidata(query: string): Promise<WikidataLookupResult> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: query,
    language: "en",
    format: "json",
    limit: "1",
    origin: "*",
  });
  const url = `${WIKIDATA_API}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { found: false, url: null, excerpt: null };
    }
    const json = (await res.json()) as {
      search?: Array<{
        id?: string;
        label?: string;
        description?: string;
      }>;
    };
    const hit = json.search?.[0];
    if (!hit?.id || !hit.description) {
      return { found: false, url: null, excerpt: null };
    }
    return {
      found: true,
      url: `https://www.wikidata.org/wiki/${hit.id}`,
      excerpt: hit.description,
    };
  } catch {
    return { found: false, url: null, excerpt: null };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Concurrency-capped parallelism
// ──────────────────────────────────────────────────────────────────────

async function mapPool<I, O>(
  items: I[],
  poolSize: number,
  fn: (item: I, index: number) => Promise<O>,
): Promise<O[]> {
  const results: O[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from(
    { length: Math.min(poolSize, items.length) },
    worker,
  );
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────────────────────────────────
// Gemma contradiction check (batched into one call)
// ──────────────────────────────────────────────────────────────────────

const CONTRADICTION_TOOL: FunctionDeclaration = {
  name: "flag_contradictions",
  description:
    "Given a list of (claim_id, lesson_definition, reference excerpts) tuples, mark which lesson definitions clearly contradict the references. Be conservative — only flag clear factual contradictions, not stylistic or summary-vs-detail differences.",
  parameters: {
    type: "object",
    properties: {
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim_id: { type: "string" },
            contradicted: { type: "boolean" },
            reason: {
              type: "string",
              description:
                "If contradicted=true, one sentence explaining the factual mismatch. Empty otherwise.",
            },
          },
          required: ["claim_id", "contradicted", "reason"],
        },
      },
    },
    required: ["claims"],
  },
};

const CONTRADICTION_SYSTEM_PROMPT = `You are a careful fact-checker reviewing K-12 lesson content.

You are given a list of claims pulled from a teacher's lesson. Each claim is paired with one or more excerpts from trusted references (Wikipedia and/or Wikidata). For each, decide whether the lesson's wording CLEARLY CONTRADICTS the references.

Rules:
- A contradiction is a factual mismatch (wrong date, wrong cause, wrong definition, swapped roles).
- A simplification, partial answer, or grade-appropriate summary is NOT a contradiction. K-12 lessons leave detail out by design.
- A claim that goes BEYOND the references but does not contradict them is NOT a contradiction.
- If the references disagree with each other, treat the claim as unverifiable and mark contradicted=false.
- If you are unsure, mark contradicted=false. False positives waste teacher time.

Emit one entry per claim_id via the flag_contradictions tool. Do not skip claims.`;

interface ContradictionInput {
  claim_id: string;
  term: string;
  lesson_definition: string;
  references: { source: string; excerpt: string }[];
}

interface ContradictionResult {
  claim_id: string;
  contradicted: boolean;
  reason: string;
}

async function batchCheckContradictions(
  inputs: ContradictionInput[],
): Promise<ContradictionResult[]> {
  if (inputs.length === 0) return [];

  const userPrompt = [
    "Check each claim against its reference excerpts. Emit a flag_contradictions tool call covering EVERY claim_id below.",
    "",
    ...inputs.map((c, i) => {
      const refs = c.references
        .map((r) => `  [${r.source}] ${r.excerpt}`)
        .join("\n");
      return (
        `[${i + 1}] claim_id=${c.claim_id}\n` +
        `term: ${c.term}\n` +
        `lesson_definition: ${c.lesson_definition}\n` +
        `references:\n${refs}`
      );
    }),
  ].join("\n\n");

  const result = await callGemma({
    systemPrompt: CONTRADICTION_SYSTEM_PROMPT,
    userPrompt,
    tool: CONTRADICTION_TOOL,
    temperature: 0.2,
  });

  const args = result.toolArgs as { claims?: unknown };
  if (!Array.isArray(args.claims)) return [];
  return args.claims.flatMap((c): ContradictionResult[] => {
    if (
      c &&
      typeof c === "object" &&
      typeof (c as { claim_id?: unknown }).claim_id === "string" &&
      typeof (c as { contradicted?: unknown }).contradicted === "boolean"
    ) {
      const r = c as { claim_id: string; contradicted: boolean; reason?: unknown };
      return [
        {
          claim_id: r.claim_id,
          contradicted: r.contradicted,
          reason: typeof r.reason === "string" ? r.reason : "",
        },
      ];
    }
    return [];
  });
}

// ──────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────

export interface VerifyInput {
  hunter: PersonaScaffold;
  christine: PersonaScaffold;
}

export async function verifyLesson(
  input: VerifyInput,
  options: VerifyOptions = {},
): Promise<VerificationReport> {
  const { hunter, christine } = input;

  const claims = extractClaims(hunter, christine);
  const findings: VerificationFinding[] = [];

  // ─── Vocabulary + misconception lookups (Wikipedia + Wikidata in parallel) ───
  if (claims.length > 0) {
    const lookups = await mapPool(claims, MAX_PARALLEL_LOOKUPS, async (c) => {
      const [wp, wd] = await Promise.all([
        lookupWikipedia(c.subject),
        lookupWikidata(c.subject),
      ]);
      return { wp, wd };
    });

    const verified: Array<{ claim: Claim; finding: VerificationFinding }> = [];

    claims.forEach((claim, i) => {
      const { wp, wd } = lookups[i];
      const id = `verify-${i + 1}`;
      const sources: SourceRef[] = [];
      if (wp.found && wp.excerpt) {
        sources.push({ name: "Wikipedia", url: wp.url, excerpt: wp.excerpt });
      }
      if (wd.found && wd.excerpt) {
        sources.push({ name: "Wikidata", url: wd.url, excerpt: wd.excerpt });
      }

      const finding: VerificationFinding = {
        id,
        claim_kind: claim.kind,
        claim_subject: claim.subject,
        claim_text: claim.text,
        status: sources.length > 0 ? "verified" : "unverified",
        sources,
        notes:
          sources.length > 0
            ? null
            : wp.isDisambiguation
              ? "Wikipedia returned a disambiguation page; reference is ambiguous."
              : "No matching Wikipedia or Wikidata entry.",
      };
      findings.push(finding);
      if (sources.length > 0) verified.push({ claim, finding });
    });

    if (!options.skipContradictionCheck && verified.length > 0) {
      try {
        const inputs: ContradictionInput[] = verified.map(({ claim, finding }) => ({
          claim_id: finding.id,
          term: claim.subject,
          lesson_definition: claim.text,
          references: finding.sources
            .filter((s) => s.excerpt)
            .map((s) => ({ source: s.name, excerpt: s.excerpt! })),
        }));
        const results = await batchCheckContradictions(inputs);
        const byId = new Map(results.map((r) => [r.claim_id, r]));
        for (const finding of findings) {
          const r = byId.get(finding.id);
          if (r?.contradicted) {
            finding.status = "contradicted";
            finding.notes = r.reason || finding.notes;
          }
        }
      } catch {
        // Contradiction-check failure is non-fatal: keep statuses as-is.
      }
    }
  }

  return summarize(findings);
}

// ──────────────────────────────────────────────────────────────────────
// Map verification findings → ReviewIssue[]
// ──────────────────────────────────────────────────────────────────────

/**
 * Contradicted claims become must_fix issues. Unverified vocabulary
 * surfaces in the verification block but doesn't fail the build — many
 * K-12 vocab terms simply aren't standalone Wikipedia entries.
 */
export function verificationToReviewIssues(
  report: VerificationReport,
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  for (const finding of report.findings) {
    if (finding.status !== "contradicted") continue;

    const sourceName = finding.sources[0]?.name ?? "trusted source";
    const sourceUrl = finding.sources[0]?.url;

    issues.push({
      id: `issue-${finding.id}`,
      issue_type: "source",
      severity: "must_fix",
      where: `${finding.claim_kind}: ${finding.claim_subject}`,
      problem: `Lesson contradicts ${sourceName}: ${finding.notes ?? "factual mismatch"}.`,
      fix: `Revise the ${finding.claim_kind} entry for "${finding.claim_subject}" to match the reference${sourceUrl ? ` (${sourceUrl})` : ""}.`,
    });
  }
  return issues;
}

// ──────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────

function summarize(findings: VerificationFinding[]): VerificationReport {
  return {
    generated_at: new Date().toISOString(),
    total_checked: findings.length,
    verified_count: findings.filter((f) => f.status === "verified").length,
    unverified_count: findings.filter((f) => f.status === "unverified").length,
    contradicted_count: findings.filter((f) => f.status === "contradicted").length,
    findings,
  };
}
