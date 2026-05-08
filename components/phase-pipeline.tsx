"use client";

import type { RunStatus } from "@/lib/types";

const PHASES = [
  {
    key: "build",
    label: "Build",
    sublabel: "Hunter + Christine drafting",
  },
  {
    key: "review",
    label: "Review",
    sublabel: "Audit + source verification",
  },
  {
    key: "package",
    label: "Package",
    sublabel: "Finalize and merge",
  },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];
type PhaseState = "pending" | "active" | "complete";

const STATUS_INDEX: Record<RunStatus, number> = {
  pending: 0,
  building: 1,
  reviewing: 2,
  packaging: 3,
  complete: 4,
  failed: 4,
};

const PHASE_INDEX: Record<PhaseKey, number> = {
  build: 1,
  review: 2,
  package: 3,
};

function phaseState(status: RunStatus, phase: PhaseKey): PhaseState {
  const cur = STATUS_INDEX[status];
  const idx = PHASE_INDEX[phase];
  if (cur > idx) return "complete";
  if (cur === idx) return "active";
  return "pending";
}

export function PhasePipeline({ status }: { status: RunStatus }) {
  // Hide once the run reaches a terminal state — the page below is the
  // answer at that point. Pipeline is for in-flight feedback only.
  if (status === "complete" || status === "failed") return null;

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 py-2.5 bg-paper/90 backdrop-blur-md border-b border-hunter-100 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-stretch gap-2">
        {PHASES.map((p, i) => (
          <div key={p.key} className="flex items-stretch gap-2 flex-1 min-w-0">
            <PhaseChip phase={p} state={phaseState(status, p.key)} />
            {i < PHASES.length - 1 && (
              <Connector active={phaseState(status, p.key) === "complete"} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseChip({
  phase,
  state,
}: {
  phase: (typeof PHASES)[number];
  state: PhaseState;
}) {
  const baseClass =
    "flex items-center gap-2.5 px-3 py-1.5 rounded-md border flex-1 min-w-0 transition-colors";
  if (state === "complete") {
    return (
      <div className={`${baseClass} bg-green-50 border-green-200 text-green-900`}>
        <span className="text-sm leading-none">&#10003;</span>
        <span className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-tight">{phase.label}</p>
          <p className="text-[10px] text-green-700/80 leading-tight truncate">
            {phase.sublabel}
          </p>
        </span>
      </div>
    );
  }
  if (state === "active") {
    return (
      <div
        className={`${baseClass} bg-hunter-50 border-hunter-300 text-hunter-900`}
      >
        <WaveDots />
        <span className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">{phase.label}</p>
          <p className="text-[10px] text-hunter-700 leading-tight truncate">
            {phase.sublabel}
          </p>
        </span>
      </div>
    );
  }
  return (
    <div
      className={`${baseClass} bg-paper border-hunter-100 opacity-55`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-hunter-200 shrink-0" />
      <span className="flex-1 min-w-0">
        <p className="text-xs font-medium text-(--color-muted) leading-tight">
          {phase.label}
        </p>
        <p className="text-[10px] text-(--color-muted)/70 leading-tight truncate">
          {phase.sublabel}
        </p>
      </span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`self-center h-px w-3 ${active ? "bg-hunter-300" : "bg-hunter-100"}`}
    />
  );
}

/** Five dots bouncing in sequence — reads as "still working." */
function WaveDots() {
  return (
    <span className="inline-flex items-end gap-0.5 h-3 shrink-0">
      <span className="h-1 w-1 rounded-full bg-hunter-700 animate-bounce" />
      <span className="h-1 w-1 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.1s]" />
      <span className="h-1 w-1 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.2s]" />
      <span className="h-1 w-1 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.3s]" />
      <span className="h-1 w-1 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.4s]" />
    </span>
  );
}

/** A bigger version of the same indicator for inline section placeholders. */
export function PendingSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-lg border border-hunter-200 bg-hunter-50/50 px-5 py-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex items-end gap-1 h-5 mt-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-hunter-700 animate-bounce" />
          <span className="h-1.5 w-1.5 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.1s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-hunter-700 animate-bounce [animation-delay:0.4s]" />
        </span>
        <div className="flex-1">
          <h3 className="font-serif text-lg leading-tight">{title}</h3>
          <p className="text-sm text-(--color-muted) mt-1">{description}</p>
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded bg-hunter-100/70 w-5/6 animate-pulse" />
            <div className="h-2 rounded bg-hunter-100/70 w-4/6 animate-pulse [animation-delay:0.1s]" />
            <div className="h-2 rounded bg-hunter-100/70 w-3/6 animate-pulse [animation-delay:0.2s]" />
          </div>
        </div>
      </div>
    </section>
  );
}
