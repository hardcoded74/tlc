"use client";

import { useState } from "react";

export interface UploadedSource {
  sourceId: string;
  charCount: number;
  excerptPreview: string;
  parseMethod: "text" | "markdown" | "pdf_pypdf";
}

export function SourceUpload({
  onUploaded,
  disabled,
}: {
  onUploaded: (source: UploadedSource | null) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [pasted, setPasted] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedSource | null>(null);

  async function submitPaste() {
    if (pasted.trim().length < 10) {
      setError("Paste at least a sentence or two.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/source/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasted, filename: "pasted_text.md" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Upload failed (${res.status})`);
        setUploading(false);
        return;
      }
      const data = (await res.json()) as UploadedSource;
      setUploaded(data);
      onUploaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  async function submitFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/source/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const hint = typeof body.hint === "string" ? ` — ${body.hint}` : "";
        setError((body.error ?? `Upload failed (${res.status})`) + hint);
        setUploading(false);
        return;
      }
      const data = (await res.json()) as UploadedSource;
      setUploaded(data);
      onUploaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setUploaded(null);
    setPasted("");
    setError(null);
    onUploaded(null);
  }

  if (uploaded) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-green-900">
            Source attached — {uploaded.charCount.toLocaleString()} chars
          </p>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-green-800 underline hover:text-green-900"
            disabled={disabled || uploading}
          >
            Remove
          </button>
        </div>
        <p className="text-xs text-green-900/80 whitespace-pre-wrap">
          {uploaded.excerptPreview}
        </p>
        <p className="text-xs text-green-900/60">
          Hunter and Christine will prefer this source and label sections
          as <em>grounded</em>, <em>scaffolded</em>, or <em>generated</em>.
          The text is deleted after one hour.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <ModeTab
          label="Paste text"
          active={mode === "paste"}
          onClick={() => setMode("paste")}
          disabled={disabled || uploading}
        />
        <ModeTab
          label="Upload .txt / .md"
          active={mode === "file"}
          onClick={() => setMode("file")}
          disabled={disabled || uploading}
        />
      </div>

      {mode === "paste" ? (
        <div className="space-y-2">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the reading, standard, or excerpt here. Hunter and Christine will anchor the lesson to this text."
            rows={5}
            disabled={disabled || uploading}
            className="w-full px-3 py-2 rounded-md border border-hunter-100 focus:border-hunter-500 focus:outline-none focus:ring-2 focus:ring-hunter-300/40 bg-paper disabled:bg-hunter-50 disabled:cursor-not-allowed resize-y font-mono text-xs"
          />
          <button
            type="button"
            onClick={submitPaste}
            disabled={disabled || uploading || pasted.trim().length < 10}
            className="px-4 py-1.5 rounded-md border border-hunter-300 text-sm text-hunter-700 hover:bg-hunter-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Attaching…" : "Attach as source"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            accept=".txt,.md,.markdown"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) submitFile(f);
              // Reset the input so the same file can be re-selected after removing.
              e.target.value = "";
            }}
            className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-hunter-300 file:bg-hunter-50 file:text-hunter-700 hover:file:bg-hunter-100"
          />
          <p className="text-xs text-(--color-muted)">
            .txt and .md files only. PDF ingest is planned; for now, paste
            the relevant excerpt.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {error}
        </div>
      )}
    </div>
  );
}

function ModeTab({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded-full border transition ${
        active
          ? "bg-hunter-700 text-white border-hunter-700"
          : "bg-paper text-(--color-muted) border-hunter-200 hover:text-ink"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {label}
    </button>
  );
}
