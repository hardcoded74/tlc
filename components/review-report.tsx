"use client";

import type {
  ReviewIssue,
  ReviewReport,
  VerificationFinding,
  VerificationReport,
} from "@/lib/types";

const SEVERITY_STYLE: Record<string, { label: string; chip: string; bar: string }> = {
  must_fix: {
    label: "Must fix",
    chip: "bg-red-50 text-red-800 border-red-200",
    bar: "bg-red-500",
  },
  should_fix: {
    label: "Should fix",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
    bar: "bg-amber-500",
  },
  nice_to_fix: {
    label: "Nice to fix",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    bar: "bg-sky-500",
  },
};

const ASSESSMENT_BANNER: Record<ReviewReport["overall_assessment"], { label: string; tone: string }> = {
  strong_first_pass: {
    label: "Strong first pass",
    tone: "bg-green-50 border-green-200 text-green-900",
  },
  needs_revision: {
    label: "Needs revision — package phase will address",
    tone: "bg-amber-50 border-amber-200 text-amber-900",
  },
  must_regenerate: {
    label: "Must regenerate — critical gaps flagged",
    tone: "bg-red-50 border-red-200 text-red-900",
  },
};

export function ReviewPanel({ review }: { review: ReviewReport }) {
  const banner = ASSESSMENT_BANNER[review.overall_assessment];
  return (
    <section className="rounded-lg border border-hunter-100 bg-paper overflow-hidden">
      <header className="px-5 py-4 border-b border-hunter-100 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl">Review findings</h3>
          <p className="text-xs text-(--color-muted) mt-0.5">
            TLC audits both Teacher&rsquo;s Assistants before packaging.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Counter count={review.must_fix_count} kind="must_fix" />
          <Counter count={review.should_fix_count} kind="should_fix" />
          <Counter count={review.nice_to_fix_count} kind="nice_to_fix" />
        </div>
      </header>

      <div className={`px-5 py-3 border-b ${banner.tone} text-sm`}>
        <strong>{banner.label}</strong> · Grade fit:{" "}
        {review.grade_fit.rating.replace(/_/g, " ")} · Source alignment:{" "}
        {review.source_alignment.replace(/_/g, " ")}
      </div>

      <div className="divide-y divide-hunter-100">
        {review.issues.length === 0 ? (
          <p className="px-5 py-4 text-sm text-(--color-muted) italic">
            No issues flagged. Proceeding to packaging.
          </p>
        ) : (
          review.issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)
        )}
      </div>

      {review.verification && review.verification.total_checked > 0 ? (
        <VerificationBlock verification={review.verification} />
      ) : null}
    </section>
  );
}

function VerificationBlock({ verification }: { verification: VerificationReport }) {
  return (
    <section className="border-t border-hunter-100 bg-hunter-50/30">
      <header className="px-5 py-3 flex items-center justify-between">
        <div>
          <h4 className="font-serif text-base">Source verification</h4>
          <p className="text-xs text-(--color-muted) mt-0.5">
            Vocabulary and misconception corrections cross-referenced against
            Wikipedia.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <VerifyChip
            count={verification.verified_count}
            tone="bg-green-50 text-green-800 border-green-200"
            dot="bg-green-500"
            label="verified"
          />
          <VerifyChip
            count={verification.unverified_count}
            tone="bg-slate-50 text-slate-700 border-slate-200"
            dot="bg-slate-400"
            label="not found"
          />
          <VerifyChip
            count={verification.contradicted_count}
            tone="bg-red-50 text-red-800 border-red-200"
            dot="bg-red-500"
            label="contradicted"
          />
        </div>
      </header>
      <ul className="divide-y divide-hunter-100">
        {verification.findings.map((f) => (
          <FindingRow key={f.id} finding={f} />
        ))}
      </ul>
    </section>
  );
}

function VerifyChip({
  count,
  tone,
  dot,
  label,
}: {
  count: number;
  tone: string;
  dot: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {count} {label}
    </span>
  );
}

function FindingRow({ finding }: { finding: VerificationFinding }) {
  const statusStyle: Record<
    VerificationFinding["status"],
    { dot: string; label: string }
  > = {
    verified: { dot: "bg-green-500", label: "Verified" },
    unverified: { dot: "bg-slate-400", label: "Not found" },
    contradicted: { dot: "bg-red-500", label: "Contradicted" },
  };
  const style = statusStyle[finding.status];
  const kindLabel =
    finding.claim_kind === "standards_code"
      ? "standards code"
      : finding.claim_kind;
  return (
    <li className="px-5 py-3 text-sm">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 rounded-full ${style.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{finding.claim_subject}</span>
            <span className="text-xs uppercase tracking-wider text-(--color-muted)">
              {kindLabel}
            </span>
            <span className="text-xs text-(--color-muted)">·</span>
            <span className="text-xs text-(--color-muted)">{style.label}</span>
            {finding.sources.map((s) =>
              s.url ? (
                <a
                  key={`${s.name}-${s.url}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-hunter-700 hover:underline"
                >
                  {s.name} ↗
                </a>
              ) : (
                <span
                  key={s.name}
                  className="text-xs text-(--color-muted)"
                >
                  {s.name}
                </span>
              ),
            )}
          </div>
          {finding.notes ? (
            <p className="mt-1 text-xs text-(--color-muted)">{finding.notes}</p>
          ) : null}
          {finding.sources.some((s) => s.excerpt) &&
          finding.status !== "unverified" ? (
            <details className="mt-1.5 text-xs">
              <summary className="cursor-pointer text-(--color-muted) hover:text-ink">
                Show source excerpts
              </summary>
              <div className="mt-1 space-y-1">
                {finding.sources
                  .filter((s) => s.excerpt)
                  .map((s) => (
                    <p
                      key={`excerpt-${s.name}`}
                      className="text-xs text-(--color-muted) bg-paper border border-hunter-100 rounded px-2 py-1.5"
                    >
                      <span className="font-mono text-[10px] text-hunter-700 mr-1.5">
                        [{s.name}]
                      </span>
                      {s.excerpt}
                    </p>
                  ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Counter({ count, kind }: { count: number; kind: keyof typeof SEVERITY_STYLE }) {
  const style = SEVERITY_STYLE[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${style.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.bar}`} />
      {count} {style.label.toLowerCase()}
    </span>
  );
}

function IssueRow({ issue }: { issue: ReviewIssue }) {
  const style = SEVERITY_STYLE[issue.severity];
  return (
    <details className="group">
      <summary className="px-5 py-3 cursor-pointer list-none flex items-start gap-3 hover:bg-hunter-50/60">
        <span className={`mt-1 h-2 w-2 rounded-full ${style.bar} shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-(--color-muted)">
            <span className={`px-1.5 py-0.5 rounded border ${style.chip}`}>
              {style.label}
            </span>
            <span className="font-mono">{issue.issue_type}</span>
            <span>·</span>
            <code className="font-mono">{issue.where}</code>
          </div>
          <p className="mt-1 text-sm text-ink">{issue.problem}</p>
        </div>
        <span className="text-xs text-(--color-muted) group-open:rotate-180 transition">&#9662;</span>
      </summary>
      <div className="px-5 py-3 bg-hunter-50/40 text-sm space-y-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-(--color-muted) mb-1">Suggested fix</p>
          <p>{issue.fix}</p>
        </div>
      </div>
    </details>
  );
}
