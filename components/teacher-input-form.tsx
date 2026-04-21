"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SourceUpload, type UploadedSource } from "./source-upload";

const GRADE_OPTIONS = [
  "Kindergarten",
  "1st grade",
  "2nd grade",
  "3rd grade",
  "4th grade",
  "5th grade",
  "6th grade",
  "7th grade",
  "8th grade",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
  "College / adult learners",
] as const;

const SUBJECT_OPTIONS = [
  "",
  "Science",
  "Math",
  "English / Language Arts",
  "Social Studies",
  "History",
  "Art",
  "Music",
  "Physical Education",
  "Health",
  "Computer Science",
  "Foreign Language",
  "Other",
] as const;

export function TeacherInputForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("5th grade");
  const [classLength, setClassLength] = useState<number>(45);
  const [subject, setSubject] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [differentiation, setDifferentiation] = useState(true);
  const [homework, setHomework] = useState(false);
  const [enrichment, setEnrichment] = useState(false);
  const [source, setSource] = useState<UploadedSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/lesson/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          gradeLevel,
          classLength,
          subject: subject || undefined,
          objective: objective.trim() || undefined,
          notes: notes.trim() || undefined,
          sourceUploadId: source?.sourceId ?? undefined,
          options: { differentiation, homework, enrichment },
        }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setError(
          `Rate limit reached (${body.limit ?? 10} lessons/hour). Try again in ${Math.ceil((body.retryAfterSeconds ?? 3600) / 60)} min.`,
        );
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const issues = Array.isArray(body.issues)
          ? body.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join("; ")
          : null;
        setError(issues ?? body.error ?? `Request failed (${res.status}).`);
        setSubmitting(false);
        return;
      }

      const { runId } = (await res.json()) as { runId: string };
      router.push(`/lesson/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  const disabled = submitting || topic.trim().length < 2;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. photosynthesis, fractions, Civil Rights Movement"
          required
          minLength={2}
          maxLength={200}
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="grade">Grade level</Label>
          <Select
            id="grade"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            disabled={submitting}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="length">Class length (minutes)</Label>
          <Input
            id="length"
            type="number"
            min={10}
            max={300}
            value={classLength}
            onChange={(e) => setClassLength(Number(e.target.value))}
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject (optional)</Label>
        <Select
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
        >
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "—"}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="objective">Learning objective (optional)</Label>
        <Input
          id="objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="If you know what students should take away, tell Hunter."
          maxLength={500}
          disabled={submitting}
        />
        <Hint>Leave blank and Hunter will draft one.</Hint>
      </div>

      <div>
        <Label htmlFor="notes">Notes for the personas (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context that shapes the lesson — classroom quirks, prior lessons, constraints."
          rows={4}
          maxLength={2000}
          disabled={submitting}
        />
      </div>

      <div>
        <Label htmlFor="source">Source material (optional)</Label>
        <SourceUpload onUploaded={setSource} disabled={submitting} />
        <Hint>
          A standard, reading, or textbook excerpt. Sections of the lesson
          will be tagged as <em>grounded</em> when Hunter and Christine use it.
        </Hint>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink mb-2">Optional sections</legend>
        <Checkbox
          id="diff"
          checked={differentiation}
          onChange={(e) => setDifferentiation(e.target.checked)}
          disabled={submitting}
        >
          Differentiation for struggling and advanced learners
        </Checkbox>
        <Checkbox
          id="hw"
          checked={homework}
          onChange={(e) => setHomework(e.target.checked)}
          disabled={submitting}
        >
          Homework
        </Checkbox>
        <Checkbox
          id="enrich"
          checked={enrichment}
          onChange={(e) => setEnrichment(e.target.checked)}
          disabled={submitting}
        >
          Enrichment activity
        </Checkbox>
      </fieldset>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          type="submit"
          disabled={disabled}
          className="px-6 py-3 rounded-md bg-hunter-700 text-white text-base font-medium hover:bg-hunter-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Sending to Hunter + Christine…" : "Build lesson"}
        </button>
        <p className="text-xs text-(--color-muted)">
          Hunter handles structure. Christine handles engagement. Gemma 4 powers both.
        </p>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Small unstyled-to-Tailwind primitives — we're not pulling in shadcn/ui
// for a seven-field form. If the visual gap grows, we swap these for
// Radix-backed components on Day 15 (polish pass).
// ──────────────────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-(--color-muted) mt-1">{children}</p>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-md border border-hunter-100 focus:border-hunter-500 focus:outline-none focus:ring-2 focus:ring-hunter-300/40 bg-paper disabled:bg-hunter-50 disabled:cursor-not-allowed"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 rounded-md border border-hunter-100 focus:border-hunter-500 focus:outline-none focus:ring-2 focus:ring-hunter-300/40 bg-paper disabled:bg-hunter-50 disabled:cursor-not-allowed resize-y"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-md border border-hunter-100 focus:border-hunter-500 focus:outline-none focus:ring-2 focus:ring-hunter-300/40 bg-paper disabled:bg-hunter-50 disabled:cursor-not-allowed"
    />
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  disabled,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-hunter-300 text-hunter-700 focus:ring-hunter-500"
      />
      <span>{children}</span>
    </label>
  );
}
