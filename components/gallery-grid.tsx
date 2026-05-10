"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GalleryListItem, GradeBand, LengthBucket } from "@/lib/gallery";
import { GalleryFilters, type SortOption } from "./gallery-filters";

export function GalleryGrid({ lessons }: { lessons: GalleryListItem[] }) {
  const [gradeBands, setGradeBands] = useState<Set<GradeBand>>(new Set());
  const [subjects, setSubjects] = useState<Set<string>>(new Set());
  const [lengthBuckets, setLengthBuckets] = useState<Set<LengthBucket>>(new Set());
  const [sort, setSort] = useState<SortOption>("newest");

  // Subjects available in the loaded set — derived, not hardcoded.
  const availableSubjects = useMemo(() => {
    const s = new Set<string>();
    for (const l of lessons) if (l.subject) s.add(l.subject);
    return Array.from(s).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    let out = lessons.filter((l) => {
      if (gradeBands.size > 0 && !gradeBands.has(l.gradeBand)) return false;
      if (subjects.size > 0) {
        if (!l.subject || !subjects.has(l.subject)) return false;
      }
      if (lengthBuckets.size > 0 && !lengthBuckets.has(l.lengthBucket)) {
        return false;
      }
      return true;
    });

    out = [...out];
    if (sort === "newest") {
      out.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    } else if (sort === "most-reacted") {
      out.sort((a, b) => b.reactionCount - a.reactionCount);
    } else if (sort === "most-remixed") {
      out.sort((a, b) => b.remixCount - a.remixCount);
    }
    return out;
  }, [lessons, gradeBands, subjects, lengthBuckets, sort]);

  const totalActiveFilters =
    gradeBands.size + subjects.size + lengthBuckets.size;

  return (
    <>
      <GalleryFilters
        availableSubjects={availableSubjects}
        gradeBands={gradeBands}
        setGradeBands={setGradeBands}
        subjects={subjects}
        setSubjects={setSubjects}
        lengthBuckets={lengthBuckets}
        setLengthBuckets={setLengthBuckets}
        sort={sort}
        setSort={setSort}
        showingCount={filtered.length}
        totalCount={lessons.length}
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-hunter-200 bg-hunter-50/40 px-6 py-10 text-center">
          <p className="font-serif text-lg">No lessons match these filters.</p>
          {totalActiveFilters > 0 ? (
            <button
              type="button"
              onClick={() => {
                setGradeBands(new Set());
                setSubjects(new Set());
                setLengthBuckets(new Set());
              }}
              className="mt-3 text-sm text-hunter-700 underline hover:text-hunter-900"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <GalleryCard key={l.id} lesson={l} />
          ))}
        </section>
      )}
    </>
  );
}

function GalleryCard({ lesson }: { lesson: GalleryListItem }) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="group rounded-lg border border-hunter-100 bg-paper p-5 hover:border-hunter-300 hover:shadow-sm transition flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 text-xs text-(--color-muted) flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-hunter-50 text-hunter-700">
          {lesson.gradeLevel}
        </span>
        {lesson.subject && (
          <span className="px-2 py-0.5 rounded-full bg-christine-50 text-christine-700">
            {lesson.subject}
          </span>
        )}
        <span>· {lesson.estimatedMinutes} min</span>
      </div>
      <h3 className="font-serif text-xl leading-tight group-hover:text-hunter-700">
        {lesson.title}
      </h3>
      <p className="text-sm text-(--color-muted) line-clamp-3">{lesson.overview}</p>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-(--color-muted)">
        <span>{lesson.groundingLabel}</span>
        <span className="flex items-center gap-3">
          {lesson.remixCount > 0 && (
            <span title={`${lesson.remixCount} remixes`}>↻ {lesson.remixCount}</span>
          )}
          {lesson.reactionCount > 0 && (
            <span title={`${lesson.reactionCount} found this useful`}>
              ♥ {lesson.reactionCount}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
