"use client";

import { useState } from "react";
import type { LessonPackage } from "@/lib/types";
import { SourcePill } from "./source-pill";

const TABS = [
  { id: "plan", label: "Plan" },
  { id: "materials", label: "Materials" },
  { id: "activities", label: "Activities" },
  { id: "assessment", label: "Assessment" },
  { id: "notes", label: "Notes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function LessonPackageView({ pkg }: { pkg: LessonPackage }) {
  const [active, setActive] = useState<TabId>("plan");

  return (
    <article className="rounded-lg border border-hunter-100 bg-paper overflow-hidden">
      <header className="px-6 py-5 border-b border-hunter-100">
        <h2 className="font-serif text-2xl leading-tight">{pkg.title}</h2>
        <p className="mt-1 text-xs text-(--color-muted)">
          {pkg.grade_level} · {pkg.estimated_minutes} min
          {pkg.subject ? ` · ${pkg.subject}` : ""}
        </p>
        <p className="mt-3 text-sm leading-relaxed border-l-3 border-hunter-300 pl-3">
          <strong>Objective.</strong> {pkg.objective}
        </p>
      </header>

      <nav className="flex overflow-x-auto border-b border-hunter-100 bg-hunter-50/40">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap transition ${
              active === t.id
                ? "text-ink border-b-2 border-hunter-700 font-medium bg-paper"
                : "text-(--color-muted) hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="px-6 py-6 lesson-prose text-[15px]">
        {active === "plan" && <PlanTab pkg={pkg} />}
        {active === "materials" && <MaterialsTab pkg={pkg} />}
        {active === "activities" && <ActivitiesTab pkg={pkg} />}
        {active === "assessment" && <AssessmentTab pkg={pkg} />}
        {active === "notes" && <NotesTab pkg={pkg} />}
      </div>

      <footer className="px-6 py-3 border-t border-hunter-100 bg-hunter-50/40 text-xs text-(--color-muted) flex items-center gap-3">
        <span>
          {pkg.source_summary.overall_grounding.replace(/_/g, " ")} ·{" "}
          {pkg.source_summary.grounded_section_count} grounded /{" "}
          {pkg.source_summary.generated_section_count} generated sections
        </span>
      </footer>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="font-serif text-lg text-ink mb-2">{title}</h3>
      {children}
    </section>
  );
}

function PlanTab({ pkg }: { pkg: LessonPackage }) {
  return (
    <>
      <Section title="Overview">
        <p className="leading-relaxed">{pkg.overview}</p>
      </Section>

      <Section title="Lesson steps">
        <ol className="space-y-3 list-none pl-0">
          {pkg.lesson_steps.map((s) => (
            <li key={s.step} className="pl-4 border-l-2 border-hunter-100">
              <p className="text-xs font-medium text-hunter-700">
                Step {s.step} · {s.minutes} min
                <SourcePill origin={s.source_origin} />
              </p>
              <p className="mt-1">
                <strong>Teacher:</strong> {s.teacher_action}
              </p>
              <p className="text-(--color-muted)">
                <strong>Students:</strong> {s.student_action}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

function MaterialsTab({ pkg }: { pkg: LessonPackage }) {
  return (
    <Section title="Materials">
      {pkg.materials.length === 0 ? (
        <p className="text-(--color-muted) italic">No materials listed.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {pkg.materials.map((m, i) => (
            <li key={i}>
              {m.name}
              {m.quantity ? ` (${m.quantity})` : ""}
              <SourcePill origin={m.source_origin} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ActivitiesTab({ pkg }: { pkg: LessonPackage }) {
  return (
    <>
      <Section title={`Engagement · ${pkg.engagement.minutes} min`}>
        <p className="text-xs font-medium text-christine-700 mb-1">
          {pkg.engagement.type.replace(/_/g, " ")}
          <SourcePill origin={pkg.engagement.source_origin} />
        </p>
        <p className="leading-relaxed">{pkg.engagement.prompt}</p>
      </Section>

      {pkg.demo && (
        <Section title="Demonstration">
          <p className="leading-relaxed">
            {pkg.demo.description}
            <SourcePill origin={pkg.demo.source_origin} />
          </p>
          {pkg.demo.materials_needed.length > 0 && (
            <p className="text-sm text-(--color-muted) mt-2">
              <strong>Materials:</strong> {pkg.demo.materials_needed.join(", ")}
            </p>
          )}
          {pkg.demo.teacher_tip && (
            <p className="text-sm text-(--color-muted) mt-1 italic">
              Teacher tip: {pkg.demo.teacher_tip}
            </p>
          )}
          {pkg.demo.safety_notes && (
            <p className="text-sm text-red-700 mt-1">
              <strong>Safety:</strong> {pkg.demo.safety_notes}
            </p>
          )}
        </Section>
      )}

      {pkg.guided_practice && (
        <Section title={`Guided practice · ${pkg.guided_practice.duration_minutes} min`}>
          <p className="text-xs text-(--color-muted) mb-1">
            {pkg.guided_practice.format.replace(/_/g, " ")}
            <SourcePill origin={pkg.guided_practice.source_origin} />
          </p>
          <p>{pkg.guided_practice.description}</p>
        </Section>
      )}

      {pkg.independent_practice && (
        <Section title={`Independent practice · ${pkg.independent_practice.duration_minutes} min`}>
          <p>
            {pkg.independent_practice.description}
            <SourcePill origin={pkg.independent_practice.source_origin} />
          </p>
          {pkg.independent_practice.deliverable && (
            <p className="text-sm text-(--color-muted) mt-1">
              <strong>Deliverable:</strong> {pkg.independent_practice.deliverable}
            </p>
          )}
        </Section>
      )}
    </>
  );
}

function AssessmentTab({ pkg }: { pkg: LessonPackage }) {
  return (
    <Section title={`Assessment · ${pkg.assessment.format.replace(/_/g, " ")} · ${pkg.assessment.estimated_minutes} min`}>
      <ol className="space-y-4 list-none pl-0">
        {pkg.assessment.questions.map((q) => (
          <li key={q.id} className="pl-4 border-l-2 border-hunter-100">
            <p className="text-xs font-medium text-hunter-700 uppercase">
              {q.id}
              <SourcePill origin={q.source_origin} />
            </p>
            <p className="mt-1">{q.question}</p>
            <p className="text-sm text-(--color-muted) mt-1">
              <strong>Expected:</strong> {q.expected_answer}
            </p>
            {q.rubric_notes && (
              <p className="text-sm text-(--color-muted) italic mt-1">
                Rubric: {q.rubric_notes}
              </p>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function NotesTab({ pkg }: { pkg: LessonPackage }) {
  return (
    <>
      {pkg.teacher_notes && (
        <Section title="Teacher notes">
          <p className="whitespace-pre-wrap">{pkg.teacher_notes}</p>
        </Section>
      )}

      {pkg.discussion_prompts.length > 0 && (
        <Section title="Discussion prompts">
          <ul className="space-y-2">
            {pkg.discussion_prompts.map((d, i) => (
              <li key={i}>
                <span className="text-xs uppercase tracking-wider text-christine-500 mr-2">
                  {d.purpose.replace(/_/g, " ")}
                </span>
                {d.prompt}
                <SourcePill origin={d.source_origin} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pkg.vocabulary.length > 0 && (
        <Section title="Vocabulary">
          <dl className="space-y-2">
            {pkg.vocabulary.map((v, i) => (
              <div key={i}>
                <dt className="font-medium">
                  {v.term}
                  <SourcePill origin={v.source_origin} />
                </dt>
                <dd className="text-(--color-muted)">
                  {v.definition}
                  {v.example && (
                    <span className="block italic text-sm mt-0.5">
                      e.g. {v.example}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {pkg.misconceptions.length > 0 && (
        <Section title="Common misconceptions">
          <ul className="space-y-3">
            {pkg.misconceptions.map((m, i) => (
              <li key={i} className="pl-3 border-l-2 border-christine-300">
                <p className="text-sm">
                  <strong>Misconception:</strong> {m.misconception}
                </p>
                <p className="text-sm text-(--color-muted)">
                  <strong>Correction:</strong> {m.correction}
                </p>
                <p className="text-sm text-(--color-muted) italic">
                  How to address: {m.how_to_address}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pkg.differentiation && (
        <Section title="Differentiation">
          <p>
            <strong>Struggling:</strong> {pkg.differentiation.struggling}
          </p>
          <p>
            <strong>Advanced:</strong> {pkg.differentiation.advanced}
          </p>
          {pkg.differentiation.multilingual_learners && (
            <p>
              <strong>Multilingual:</strong>{" "}
              {pkg.differentiation.multilingual_learners}
            </p>
          )}
        </Section>
      )}

      {pkg.homework && (
        <Section title={`Homework${pkg.homework.optional ? " (optional)" : ""}`}>
          <p>{pkg.homework.description}</p>
          <p className="text-sm text-(--color-muted) mt-1">
            Estimated {pkg.homework.estimated_minutes} min
          </p>
        </Section>
      )}

      {pkg.enrichment && (
        <Section title="Enrichment">
          <p className="text-sm text-(--color-muted) mb-1">
            For students who: {pkg.enrichment.for_students_who}
          </p>
          <p>{pkg.enrichment.description}</p>
        </Section>
      )}

      {pkg.standards_alignment?.standards_cited.length && (
        <Section title="Standards">
          <ul className="space-y-1.5">
            {pkg.standards_alignment.standards_cited.map((s, i) => (
              <li key={i}>
                <span className="font-mono text-sm">
                  {s.framework} {s.code}
                </span>{" "}
                — {s.description}
              </li>
            ))}
          </ul>
          {pkg.standards_alignment.notes && (
            <p className="text-sm text-(--color-muted) mt-2">
              {pkg.standards_alignment.notes}
            </p>
          )}
        </Section>
      )}
    </>
  );
}
