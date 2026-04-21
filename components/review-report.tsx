"use client";

import type { ReviewIssue, ReviewReport } from "@/lib/types";

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
            TLC audits both personas before packaging.
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
    </section>
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
