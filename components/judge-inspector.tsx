"use client";

import { useEffect, useState } from "react";
import type { PhaseTimings, TokenUsage } from "@/lib/types";

interface InspectorData {
  id: string;
  status: string;
  timings: PhaseTimings | null;
  tokenUsage: TokenUsage | null;
  hunterBuild: unknown;
  christineBuild: unknown;
  review: unknown;
  hunterPackage: unknown;
  christinePackage: unknown;
  finalPackage: unknown;
  errorLog: unknown;
}

export function JudgeInspector({ runId }: { runId: string }) {
  const [data, setData] = useState<InspectorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/lesson/${runId}?judge=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as InspectorData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    // Refresh while run is in progress so the inspector updates.
    const t = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [runId]);

  if (error) {
    return (
      <aside className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Judge inspector couldn&rsquo;t reach the API: {error}
      </aside>
    );
  }
  if (!data) {
    return (
      <aside className="rounded-lg border border-hunter-100 bg-hunter-50/40 p-4 text-xs text-(--color-muted)">
        Judge inspector loading…
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border-2 border-dashed border-hunter-300 bg-hunter-50/30 overflow-hidden">
      <header className="px-5 py-3 border-b border-hunter-200 bg-hunter-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-hunter-700 text-white text-[10px] uppercase tracking-widest font-medium">
            Judge mode
          </span>
          <span className="font-mono text-xs text-hunter-700">{data.id}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="text-xs text-hunter-700 hover:underline"
        >
          {isOpen ? "Hide internals" : "Show internals"}
        </button>
      </header>

      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Stat label="Status" value={data.status} />
        <Stat
          label="Total latency"
          value={data.timings?.total_ms != null ? `${data.timings.total_ms} ms` : "—"}
        />
        <Stat
          label="Tokens in"
          value={data.tokenUsage?.total_in != null ? data.tokenUsage.total_in.toLocaleString() : "—"}
        />
        <Stat
          label="Tokens out"
          value={data.tokenUsage?.total_out != null ? data.tokenUsage.total_out.toLocaleString() : "—"}
        />
      </div>

      {data.timings && (
        <div className="px-5 pb-4">
          <PhaseBar timings={data.timings} />
        </div>
      )}

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-hunter-100 pt-4">
          {data.tokenUsage && (
            <div className="text-xs">
              <p className="font-medium text-hunter-700 mb-1">Per-phase tokens</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-(--color-muted)">
                    <th className="text-left font-normal">Phase</th>
                    <th className="text-right font-normal">In</th>
                    <th className="text-right font-normal">Out</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {(
                    Object.keys(data.tokenUsage.by_phase) as Array<
                      keyof TokenUsage["by_phase"]
                    >
                  ).map((key) => (
                    <tr key={key} className="border-t border-hunter-100">
                      <td className="py-1">{key}</td>
                      <td className="py-1 text-right">{data.tokenUsage!.by_phase[key].in.toLocaleString()}</td>
                      <td className="py-1 text-right">{data.tokenUsage!.by_phase[key].out.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <CollapsibleJson label="hunterBuild" value={data.hunterBuild} />
          <CollapsibleJson label="christineBuild" value={data.christineBuild} />
          <CollapsibleJson label="review" value={data.review} />
          <CollapsibleJson label="hunterPackage" value={data.hunterPackage} />
          <CollapsibleJson label="christinePackage" value={data.christinePackage} />
          <CollapsibleJson label="finalPackage" value={data.finalPackage} />
          {data.errorLog ? <CollapsibleJson label="errorLog" value={data.errorLog} /> : null}
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-(--color-muted)">{label}</p>
      <p className="font-mono text-sm mt-0.5">{value}</p>
    </div>
  );
}

function PhaseBar({ timings }: { timings: PhaseTimings }) {
  const phases = [
    { key: "build_ms" as const, label: "build", color: "bg-hunter-500" },
    { key: "review_ms" as const, label: "review", color: "bg-hunter-300" },
    { key: "package_ms" as const, label: "package", color: "bg-christine-500" },
  ];
  const total = phases.reduce((a, p) => a + (timings[p.key] ?? 0), 0);
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded overflow-hidden bg-hunter-100">
        {phases.map((p) => {
          const width = ((timings[p.key] ?? 0) / total) * 100;
          return width > 0 ? (
            <div
              key={p.key}
              className={p.color}
              style={{ width: `${width}%` }}
              title={`${p.label} — ${timings[p.key]} ms`}
            />
          ) : null;
        })}
      </div>
      <div className="flex justify-between text-[10px] text-(--color-muted) font-mono">
        {phases.map((p) => (
          <span key={p.key}>
            {p.label} {timings[p.key] ?? 0} ms
          </span>
        ))}
      </div>
    </div>
  );
}

function CollapsibleJson({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <details className="rounded border border-hunter-100 bg-paper">
      <summary className="px-3 py-1.5 cursor-pointer text-xs font-mono text-hunter-700">
        {label}
      </summary>
      <pre className="px-3 py-2 text-[11px] font-mono overflow-x-auto max-h-80 whitespace-pre-wrap bg-hunter-50/40">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
