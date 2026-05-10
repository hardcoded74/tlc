"use client";

/**
 * Teacher testimonial — two-state component shown on the lesson page.
 *
 *   - If the lesson has a saved testimonial → render the credit line
 *     (name + school) plus the review quote, styled as a pull quote.
 *   - If the lesson is complete but has no testimonial yet → render a
 *     small form (name, school, review) that POSTs to the testimonial
 *     API. Optional — the lesson page works without it.
 *
 * The component takes the initial testimonial from the server (so a
 * page reload doesn't briefly flash the form) and flips to the saved
 * view immediately on a successful submit.
 */

import { useState } from "react";

export interface Testimonial {
  teacherName: string;
  teacherSchool: string;
  teacherReview: string;
  testimonialAt: string | null;
}

export function TeacherTestimonial({
  runId,
  status,
  initial,
  defaultName,
}: {
  runId: string;
  status: string;
  initial: Testimonial | null;
  defaultName?: string | null;
}) {
  const [saved, setSaved] = useState<Testimonial | null>(initial);
  const [editing, setEditing] = useState(false);

  if (status !== "complete") return null;

  if (saved && !editing) {
    return (
      <section className="rounded-md border border-hunter-200 bg-paper px-5 py-4">
        <p className="text-xs uppercase tracking-widest text-(--color-muted)">
          From the teacher
        </p>
        <blockquote className="mt-2 font-serif text-lg italic leading-snug">
          &ldquo;{saved.teacherReview}&rdquo;
        </blockquote>
        <p className="mt-3 text-sm text-(--color-muted)">
          — <span className="font-medium text-hunter-700">{saved.teacherName}</span>
          {saved.teacherSchool ? (
            <>
              , <span>{saved.teacherSchool}</span>
            </>
          ) : null}
        </p>
      </section>
    );
  }

  return (
    <TestimonialForm
      runId={runId}
      defaultName={defaultName ?? ""}
      onSaved={(t) => {
        setSaved(t);
        setEditing(false);
      }}
      onCancel={editing ? () => setEditing(false) : undefined}
    />
  );
}

function TestimonialForm({
  runId,
  defaultName,
  onSaved,
  onCancel,
}: {
  runId: string;
  defaultName: string;
  onSaved: (t: Testimonial) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [school, setSchool] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    name.trim().length > 0 && school.trim().length > 0 && review.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson/${runId}/testimonial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherName: name.trim(),
          teacherSchool: school.trim(),
          teacherReview: review.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onSaved({
        teacherName: name.trim(),
        teacherSchool: school.trim(),
        teacherReview: review.trim(),
        testimonialAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-md border border-hunter-100 bg-paper px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-(--color-muted)">
        Tell us about this lesson
      </p>
      <p className="mt-1 text-sm text-(--color-muted)">
        Optional — if you used this with students, leave a few lines for the
        next teacher and the project judges.
      </p>

      <form className="mt-3 space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-(--color-muted)">Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded border border-hunter-200 bg-white px-3 py-2"
              placeholder="Katie Smith"
              disabled={submitting}
            />
          </label>
          <label className="block text-sm">
            <span className="text-(--color-muted)">School</span>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded border border-hunter-200 bg-white px-3 py-2"
              placeholder="Shenandoah Elementary"
              disabled={submitting}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-(--color-muted)">What did you think?</span>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={2000}
            rows={3}
            className="mt-1 w-full rounded border border-hunter-200 bg-white px-3 py-2"
            placeholder="A line or two about how it went, what you'd change, what worked."
            disabled={submitting}
          />
          <span className="mt-1 block text-xs text-(--color-muted)">
            {review.length}/2000
          </span>
        </label>

        {error ? (
          <p className="text-sm text-red-700">Couldn&rsquo;t save: {error}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!ready || submitting}
            className="rounded bg-hunter-700 text-white text-sm px-4 py-2 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-sm text-hunter-700 hover:underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
