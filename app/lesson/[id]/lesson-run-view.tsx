"use client";

import { useMemo } from "react";
import { useLessonStream } from "@/lib/stream";
import { PersonaPanel } from "@/components/persona-panel";
import { PhasePipeline, PendingSection } from "@/components/phase-pipeline";
import { WhileYouWait } from "@/components/while-you-wait";
import { WaitNotice } from "@/components/wait-notice";
import { TopicHook } from "@/components/topic-hook";
import { ReviewPanel } from "@/components/review-report";
import { LessonPackageView } from "@/components/lesson-package";
import { DownloadButtons } from "@/components/download-buttons";
import type {
  LessonPackage,
  PersonaScaffold,
  ReviewReport,
  RunStatus,
} from "@/lib/types";

export interface InitialState {
  id: string;
  status: RunStatus;
  topic: string;
  gradeLevel: string;
  subject: string | null;
  classLength: number | null;
  createdAt: string; // ISO 8601 — anchor for the in-flight elapsed timer
  hunterScaffold: PersonaScaffold | null;
  christineScaffold: PersonaScaffold | null;
  review: ReviewReport | null;
  finalPackage: LessonPackage | null;
}

export function LessonRunView({ initial }: { initial: InitialState }) {
  // Only subscribe to streaming if the run isn't already complete.
  const shouldStream =
    initial.status !== "complete" && initial.status !== "failed";
  const live = useLessonStream(shouldStream ? initial.id : null);

  // Overlay live events on the initial DB snapshot.
  const status: RunStatus = live.status !== "pending" ? live.status : initial.status;
  const hunter = live.hunterScaffold ?? initial.hunterScaffold;
  const christine = live.christineScaffold ?? initial.christineScaffold;
  const review = live.review ?? initial.review;
  const finalPackage = live.finalPackage ?? initial.finalPackage;

  const hunterPhase = phaseFor(status, hunter);
  const christinePhase = phaseFor(status, christine);

  const runHeaderSubject = useMemo(() => {
    const parts: string[] = [];
    parts.push(initial.gradeLevel);
    if (initial.subject) parts.push(initial.subject);
    if (initial.classLength) parts.push(`${initial.classLength} min`);
    return parts.join(" · ");
  }, [initial.gradeLevel, initial.subject, initial.classLength]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-(--color-muted)">
            Lesson run · {runHeaderSubject}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl mt-1 leading-tight">
            {finalPackage?.title ?? initial.topic}
          </h1>
        </div>
        <StatusBadge status={status} error={live.error} />
      </header>

      <WaitNotice activeRun={status !== "complete" && status !== "failed"} />

      <PhasePipeline status={status} />

      <WhileYouWait status={status} createdAt={initial.createdAt} />

      <TopicHook
        topic={initial.topic}
        hidden={status === "complete" || status === "failed"}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PersonaPanel persona="hunter" scaffold={hunter} phase={hunterPhase} />
        <PersonaPanel persona="christine" scaffold={christine} phase={christinePhase} />
      </section>

      {review ? (
        <section>
          <ReviewPanel review={review} />
        </section>
      ) : status === "reviewing" || status === "packaging" ? (
        <PendingSection
          title="Reviewing both scaffolds"
          description="Auditing structure, depth, and alignment — and cross-referencing every vocabulary term and misconception correction against Wikipedia and Wikidata."
        />
      ) : null}

      {finalPackage ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif text-2xl">Final lesson package</h2>
            <DownloadButtons runId={initial.id} />
          </div>
          <LessonPackageView pkg={finalPackage} />
        </section>
      ) : status === "packaging" ||
        (status === "reviewing" && review) ? (
        <PendingSection
          title="Finalizing the lesson package"
          description="Hunter and Christine emit a delta with their revisions; the merge layer assembles the final package by field ownership."
        />
      ) : status === "complete" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The run is marked complete but no final package is attached.
          This is a bug — please report it.
        </div>
      ) : status === "failed" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>Lesson generation failed.</strong>
          {live.error ? <p className="mt-1">{live.error}</p> : null}
          <p className="mt-2">
            <a href="/create" className="underline">
              Try again
            </a>{" "}
            — this is usually a transient API issue.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  error,
}: {
  status: RunStatus;
  error: string | null;
}) {
  if (error || status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> failed
      </span>
    );
  }
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-800 border border-green-200">
        &#10003; complete
      </span>
    );
  }
  const label: Record<Exclude<RunStatus, "complete" | "failed">, string> = {
    pending: "starting",
    building: "building",
    reviewing: "reviewing",
    packaging: "packaging",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-paper border border-hunter-200 text-hunter-700">
      <span className="h-1.5 w-1.5 rounded-full bg-hunter-500 animate-pulse" />
      {label[status]}…
    </span>
  );
}

function phaseFor(
  status: RunStatus,
  scaffold: PersonaScaffold | null,
): "waiting" | "thinking" | "complete" {
  // Terminal states win: once the run is complete or failed, the panel
  // should stop pretending the persona is still working. Otherwise an
  // already-finished lesson page shows perpetual "thinking" placeholders
  // sitting next to a fully-rendered final package.
  if (status === "complete" || status === "failed") return "complete";
  if (scaffold) return "complete";
  if (status === "pending") return "waiting";
  return "thinking";
}
