import type { SourceOrigin } from "@/lib/types";

const STYLES: Record<SourceOrigin, { label: string; className: string; hint: string }> = {
  grounded: {
    label: "source-grounded",
    className: "bg-green-50 text-green-700 border-green-200",
    hint: "Traces directly to the teacher's uploaded source.",
  },
  scaffolded: {
    label: "scaffolded",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    hint: "Source shaped the structure; wording is the persona's.",
  },
  generated: {
    label: "AI-generated — review",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    hint: "Open generation, no source ties. Teacher should review.",
  },
  not_applicable: {
    label: "",
    className: "",
    hint: "",
  },
};

export function SourcePill({ origin }: { origin: SourceOrigin }) {
  if (origin === "not_applicable") return null;
  const style = STYLES[origin];
  return (
    <span
      className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${style.className}`}
      title={style.hint}
    >
      {style.label}
    </span>
  );
}
