"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersonaScaffold } from "@/lib/types";
import { PersonaAvatar } from "./persona-avatar";

type PersonaId = "hunter" | "christine";

const NARRATION_INTERVAL_MS = 12_000;
const FADE_MS = 250;

// First-person thoughts the persona seems to be having while drafting.
// Rotated inside ThinkingState. Voice stays in character: Hunter is
// direct/declarative, Christine is warm/named-pitfalls.
const HUNTER_THOUGHTS: string[] = [
  "Mapping the lesson sequence — each step has to set up the next one.",
  "Working out the assessment. The questions need to actually test the objective, not adjacent vocabulary.",
  "Counting time blocks. A 45-minute class is 45 minutes — not 60.",
  "Sketching the answer key as I go. Hard questions need clean rubric notes.",
  "Drafting the standards alignment. Being honest when nothing fits is a feature.",
  "Re-reading the objective. If it isn't measurable, it isn't an objective.",
  "Sequencing the warm-up into the main concept. No lurches.",
  "Picking concrete materials. 'Three graduated cylinders,' not 'measurement tools.'",
];

const CHRISTINE_THOUGHTS: string[] = [
  "Hunting for an opener that actually hooks 5th graders, not one that says 'get curious.'",
  "Drafting a misconception — the interesting ones are the ones I see in real classrooms.",
  "Writing the demo. It has to work with normal supplies, no Bunsen burners.",
  "Naming pitfalls in teacher_notes. Where does this lesson typically go sideways?",
  "Adding accommodations — concrete supports for specific disability types, not generic IEP language.",
  "Reading the objective sideways. What would a quiet student need to grasp this?",
  "Finding three discussion prompts that provoke thinking, not recall.",
  "Picking vocabulary terms a 5th grader doesn't already own.",
];

const PERSONA_COPY: Record<
  PersonaId,
  {
    name: string;
    role: string;
    thoughts: string[];
    cardClass: string;
    ribbonClass: string;
    dotClass: string;
  }
> = {
  hunter: {
    name: "Hunter",
    role: "Structure & rigor",
    thoughts: HUNTER_THOUGHTS,
    cardClass: "border-hunter-100 bg-hunter-50/30",
    ribbonClass: "bg-hunter-700 text-white",
    dotClass: "bg-hunter-500",
  },
  christine: {
    name: "Christine",
    role: "Depth & engagement",
    thoughts: CHRISTINE_THOUGHTS,
    cardClass: "border-christine-100 bg-christine-50/30",
    ribbonClass: "bg-christine-500 text-white",
    dotClass: "bg-christine-500",
  },
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
        {phase === "thinking" && (
          <ThinkingState thoughts={copy.thoughts} dotClass={copy.dotClass} />
        )}
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

function ThinkingState({
  thoughts,
  dotClass,
}: {
  thoughts: string[];
  dotClass: string;
}) {
  // Shuffle once on mount, iterate linearly so the user sees every line
  // before any repeats. 12s cadence with a 250ms opacity fade.
  const order = useMemo(() => shuffle(thoughts.map((_, i) => i)), [thoughts]);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setStep((s) => (s + 1) % order.length);
        setVisible(true);
      }, FADE_MS);
      return () => clearTimeout(t);
    }, NARRATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [order.length]);

  const line = thoughts[order[step]];

  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex gap-1 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce`} />
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce [animation-delay:0.15s]`} />
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce [animation-delay:0.3s]`} />
        </span>
        <span
          className="italic text-ink leading-snug transition-opacity ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
          aria-live="polite"
        >
          {line}
        </span>
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
