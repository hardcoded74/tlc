"use client";

import type { Dispatch, SetStateAction } from "react";
import type { GradeBand, LengthBucket } from "@/lib/gallery";

export type SortOption = "newest" | "most-reacted" | "most-remixed";

const GRADE_BANDS: GradeBand[] = ["K-2", "3-5", "6-8", "9-12", "adult"];
const LENGTH_BUCKETS: LengthBucket[] = ["≤30", "30-60", "60+"];

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "most-reacted": "Most reacted",
  "most-remixed": "Most remixed",
};

export function GalleryFilters({
  availableSubjects,
  gradeBands,
  setGradeBands,
  subjects,
  setSubjects,
  lengthBuckets,
  setLengthBuckets,
  sort,
  setSort,
  showingCount,
  totalCount,
}: {
  availableSubjects: string[];
  gradeBands: Set<GradeBand>;
  setGradeBands: Dispatch<SetStateAction<Set<GradeBand>>>;
  subjects: Set<string>;
  setSubjects: Dispatch<SetStateAction<Set<string>>>;
  lengthBuckets: Set<LengthBucket>;
  setLengthBuckets: Dispatch<SetStateAction<Set<LengthBucket>>>;
  sort: SortOption;
  setSort: Dispatch<SetStateAction<SortOption>>;
  showingCount: number;
  totalCount: number;
}) {
  const activeCount = gradeBands.size + subjects.size + lengthBuckets.size;

  return (
    <section className="space-y-3 rounded-md border border-hunter-100 bg-paper px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <ChipRow
          label="Grade"
          values={GRADE_BANDS}
          selected={gradeBands}
          onToggle={(v) => toggle(setGradeBands, v)}
        />
        {availableSubjects.length > 0 && (
          <ChipRow
            label="Subject"
            values={availableSubjects}
            selected={subjects}
            onToggle={(v) => toggle(setSubjects, v)}
          />
        )}
        <ChipRow
          label="Length"
          values={LENGTH_BUCKETS}
          selected={lengthBuckets}
          onToggle={(v) => toggle(setLengthBuckets, v)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-hunter-50 text-xs text-(--color-muted)">
        <span>
          Showing {showingCount} of {totalCount}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setGradeBands(new Set());
                setSubjects(new Set());
                setLengthBuckets(new Set());
              }}
              className="ml-3 text-hunter-700 underline hover:text-hunter-900"
            >
              Reset filters
            </button>
          ) : null}
        </span>
        <label className="flex items-center gap-2">
          <span>Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded border border-hunter-100 bg-paper px-2 py-1 text-xs text-ink focus:border-hunter-500 focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function ChipRow<T extends string>({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly T[];
  selected: Set<T>;
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-(--color-muted)">
        {label}
      </span>
      {values.map((v) => {
        const active = selected.has(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full text-xs border transition ${
              active
                ? "bg-hunter-700 text-white border-hunter-700"
                : "bg-paper text-hunter-700 border-hunter-200 hover:border-hunter-400"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function toggle<T>(
  setter: Dispatch<SetStateAction<Set<T>>>,
  value: T,
): void {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}
