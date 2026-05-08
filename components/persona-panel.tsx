"use client";

import type { PersonaScaffold } from "@/lib/types";
import { PersonaAvatar } from "./persona-avatar";

type PersonaId = "hunter" | "christine";

const PERSONA_COPY: Record<
  PersonaId,
  { name: string; role: string; pendingLine: string; cardClass: string; ribbonClass: string; dotClass: string }
> = {
  hunter: {
    name: "Hunter",
    role: "Structure & rigor",
    pendingLine: "Laying out the lesson steps and the assessment.",
    cardClass: "border-hunter-100 bg-hunter-50/30",
    ribbonClass: "bg-hunter-700 text-white",
    dotClass: "bg-hunter-500",
  },
  christine: {
    name: "Christine",
    role: "Depth & engagement",
    pendingLine: "Writing the hook, the discussion prompts, and the teacher notes.",
    cardClass: "border-christine-100 bg-christine-50/30",
    ribbonClass: "bg-christine-500 text-white",
    dotClass: "bg-christine-500",
  },
};

export function PersonaPanel({
  persona,
  scaffold,
  phase,
}: {
  persona: PersonaId;
  scaffold: PersonaScaffold | null;
  phase: "waiting" | "thinking" | "complete";
}) {
  const copy = PERSONA_COPY[persona];

  const isThinking = phase === "thinking";
  return (
    <div
      className={`rounded-lg border ${copy.cardClass} p-5 flex flex-col gap-4 min-h-64 transition-shadow duration-500 ${
        isThinking ? "shadow-md shadow-hunter-200/50" : ""
      }`}
    >
      <header className="flex items-center gap-3">
        <span
          className={`relative inline-flex transition-transform duration-300 ${
            isThinking ? "scale-105" : ""
          }`}
        >
          {isThinking && (
            <span
              aria-hidden
              className={`absolute inset-0 rounded-full ${copy.dotClass} opacity-20 animate-ping`}
            />
          )}
          <PersonaAvatar persona={persona} size="md" />
        </span>
        <div className="flex-1">
          <h3 className="font-serif text-lg leading-tight">{copy.name}</h3>
          <p className="text-xs text-(--color-muted)">{copy.role}</p>
        </div>
        <StatusPill phase={phase} dotClass={copy.dotClass} />
      </header>

      <div className="flex-1">
        {phase === "waiting" && <WaitingState />}
        {phase === "thinking" && <ThinkingState line={copy.pendingLine} dotClass={copy.dotClass} />}
        {phase === "complete" && scaffold && <ScaffoldPreview scaffold={scaffold} />}
        {phase === "complete" && !scaffold && (
          <p className="text-sm text-(--color-muted) italic">
            Done — contributions rolled into the final package below.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ phase, dotClass }: { phase: "waiting" | "thinking" | "complete"; dotClass: string }) {
  if (phase === "waiting") {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-hunter-50 text-(--color-muted)">waiting</span>;
  }
  if (phase === "thinking") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-paper border border-hunter-100 text-ink flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-pulse`} />
        thinking
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      &#10003; done
    </span>
  );
}

function WaitingState() {
  return (
    <div className="text-sm text-(--color-muted) italic py-6 text-center">
      Waiting for the build phase to start…
    </div>
  );
}

function ThinkingState({ line, dotClass }: { line: string; dotClass: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <div className="flex items-center gap-2 text-sm text-ink">
        <span className="inline-flex gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce`} />
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce [animation-delay:0.15s]`} />
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce [animation-delay:0.3s]`} />
        </span>
        <span>{line}</span>
      </div>
      <div className="w-full space-y-1.5 pt-1">
        <div className="h-2 rounded bg-hunter-100/70 w-5/6 animate-pulse" />
        <div className="h-2 rounded bg-hunter-100/70 w-4/6 animate-pulse [animation-delay:0.1s]" />
        <div className="h-2 rounded bg-hunter-100/70 w-3/6 animate-pulse [animation-delay:0.2s]" />
      </div>
    </div>
  );
}

function ScaffoldPreview({ scaffold }: { scaffold: PersonaScaffold }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wider text-(--color-muted) mb-0.5">Title</p>
        <p className="font-medium">{scaffold.title}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-(--color-muted) mb-0.5">Objective</p>
        <p>{scaffold.objective}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Metric label="Steps" value={scaffold.lesson_steps.length} />
        <Metric label="Questions" value={scaffold.assessment.questions.length} />
        <Metric label="Materials" value={scaffold.materials.length} />
        <Metric label="Prompts" value={scaffold.discussion_prompts.length} />
      </div>
      {scaffold.handoff_notes.length > 0 && (
        <details className="pt-1">
          <summary className="text-xs uppercase tracking-wider text-(--color-muted) cursor-pointer">
            {scaffold.handoff_notes.length} handoff note
            {scaffold.handoff_notes.length > 1 ? "s" : ""} to partner
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-ink">
            {scaffold.handoff_notes.map((n, i) => (
              <li key={i} className="pl-2 border-l-2 border-hunter-100">
                <code className="font-mono">{n.field}</code> · {n.reason.replace(/_/g, " ")}
                {n.note ? ` — ${n.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-hunter-100 bg-paper px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-(--color-muted)">{label}</p>
      <p className="font-serif text-xl">{value}</p>
    </div>
  );
}
