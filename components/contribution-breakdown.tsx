"use client";

import type {
  LessonPackage,
  PersonaScaffold,
  ReviewReport,
} from "@/lib/types";

/**
 * Side-by-side contribution view for judge mode. Shows for each major
 * section: what Hunter produced, what Christine produced, which side the
 * merge picked, and (for review-flagged sections) what changed in
 * Phase 3.
 */
export function ContributionBreakdown({
  hunterBuild,
  christineBuild,
  review,
  finalPackage,
}: {
  hunterBuild: PersonaScaffold | null;
  christineBuild: PersonaScaffold | null;
  review: ReviewReport | null;
  finalPackage: LessonPackage | null;
}) {
  if (!hunterBuild || !christineBuild) {
    return (
      <p className="text-sm text-(--color-muted) italic">
        Build phase outputs not yet available.
      </p>
    );
  }

  const rows: ContribRow[] = [
    {
      label: "Title",
      hunter: hunterBuild.title,
      christine: christineBuild.title,
      merged: finalPackage?.title,
      owner: "hunter-wins",
    },
    {
      label: "Objective",
      hunter: hunterBuild.objective,
      christine: christineBuild.objective,
      merged: finalPackage?.objective,
      owner: "hunter-wins",
    },
    {
      label: "Estimated minutes",
      hunter: String(hunterBuild.estimated_minutes),
      christine: String(christineBuild.estimated_minutes),
      merged: finalPackage ? String(finalPackage.estimated_minutes) : undefined,
      owner: "hunter-wins",
    },
    {
      label: "Lesson steps",
      hunter: `${hunterBuild.lesson_steps.length} steps`,
      christine: `${christineBuild.lesson_steps.length} steps`,
      merged: finalPackage
        ? `${finalPackage.lesson_steps.length} steps`
        : undefined,
      owner: "hunter-wins",
    },
    {
      label: "Engagement",
      hunter: hunterBuild.engagement.type.replace(/_/g, " "),
      christine: christineBuild.engagement.type.replace(/_/g, " "),
      merged: finalPackage?.engagement.type.replace(/_/g, " "),
      owner: "christine-wins",
    },
    {
      label: "Demo",
      hunter: hunterBuild.demo ? "✓ provided" : "—",
      christine: christineBuild.demo ? "✓ provided" : "—",
      merged: finalPackage?.demo ? "✓ provided" : "—",
      owner: "christine-wins",
    },
    {
      label: "Assessment questions",
      hunter: `${hunterBuild.assessment.questions.length}`,
      christine: `${christineBuild.assessment.questions.length}`,
      merged: finalPackage
        ? `${finalPackage.assessment.questions.length}`
        : undefined,
      owner: "hunter-wins",
    },
    {
      label: "Discussion prompts",
      hunter: `${hunterBuild.discussion_prompts.length}`,
      christine: `${christineBuild.discussion_prompts.length}`,
      merged: finalPackage
        ? `${finalPackage.discussion_prompts.length}`
        : undefined,
      owner: "union",
    },
    {
      label: "Vocabulary terms",
      hunter: `${hunterBuild.vocabulary.length}`,
      christine: `${christineBuild.vocabulary.length}`,
      merged: finalPackage
        ? `${finalPackage.vocabulary.length}`
        : undefined,
      owner: "union",
    },
    {
      label: "Misconceptions",
      hunter: `${hunterBuild.misconceptions.length}`,
      christine: `${christineBuild.misconceptions.length}`,
      merged: finalPackage
        ? `${finalPackage.misconceptions.length}`
        : undefined,
      owner: "christine-wins",
    },
    {
      label: "Materials",
      hunter: `${hunterBuild.materials.length}`,
      christine: `${christineBuild.materials.length}`,
      merged: finalPackage
        ? `${finalPackage.materials.length}`
        : undefined,
      owner: "union",
    },
    {
      label: "Teacher notes",
      hunter: hunterBuild.teacher_notes ? "✓ written" : "—",
      christine: christineBuild.teacher_notes ? "✓ written" : "—",
      merged: finalPackage?.teacher_notes ? "✓ written" : "—",
      owner: "christine-wins",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-(--color-muted)">
        <Legend />
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-hunter-200 text-(--color-muted)">
            <th className="text-left py-1.5 pr-2 font-normal">Field</th>
            <th className="text-left py-1.5 px-2 font-normal w-1/3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-hunter-700" />
                Hunter Phase 1
              </span>
            </th>
            <th className="text-left py-1.5 px-2 font-normal w-1/3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-christine-500" />
                Christine Phase 1
              </span>
            </th>
            <th className="text-left py-1.5 pl-2 font-normal">Merged</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ContribRowView key={row.label} row={row} />
          ))}
        </tbody>
      </table>

      {review && (
        <div className="text-xs text-(--color-muted) pt-2 border-t border-hunter-100">
          Review verdict: <strong>{review.overall_assessment.replace(/_/g, " ")}</strong>{" "}
          · {review.must_fix_count} must-fix · {review.should_fix_count} should-fix
          · ready_for_packaging: <strong>{String(review.ready_for_packaging)}</strong>
        </div>
      )}
    </div>
  );
}

interface ContribRow {
  label: string;
  hunter: string;
  christine: string;
  merged?: string;
  owner: "hunter-wins" | "christine-wins" | "union";
}

function ContribRowView({ row }: { row: ContribRow }) {
  const hunterClass =
    row.owner === "hunter-wins" || row.owner === "union"
      ? "bg-hunter-50/60"
      : "";
  const christineClass =
    row.owner === "christine-wins" || row.owner === "union"
      ? "bg-christine-50/60"
      : "";
  return (
    <tr className="border-b border-hunter-100/70 align-top">
      <td className="py-2 pr-2 font-medium">{row.label}</td>
      <td className={`py-2 px-2 font-mono ${hunterClass}`}>{truncate(row.hunter)}</td>
      <td className={`py-2 px-2 font-mono ${christineClass}`}>
        {truncate(row.christine)}
      </td>
      <td className="py-2 pl-2 font-mono text-ink">
        {row.merged !== undefined ? truncate(row.merged) : "—"}
      </td>
    </tr>
  );
}

function truncate(s: string): string {
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

function Legend() {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded bg-hunter-50/60 border border-hunter-200" />
        Hunter source
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded bg-christine-50/60 border border-christine-200" />
        Christine source
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded bg-gradient-to-r from-hunter-50 to-christine-50 border border-hunter-200" />
        Both contributed
      </span>
    </div>
  );
}
