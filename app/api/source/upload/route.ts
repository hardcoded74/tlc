/**
 * POST /api/source/upload
 *
 * Accepts teacher-provided source text. Two content types supported:
 *
 *   application/json   { text: "...", filename?: string }
 *       Primary path. Teacher pastes text into the form's textarea.
 *
 *   multipart/form-data  (file: File)
 *       Secondary path. File is decoded as UTF-8 (txt or md). PDF is
 *       deferred; the UI routes PDFs to a "paste text instead" hint.
 *
 * On success: returns { sourceId, charCount, parseMethod, excerptPreview,
 *                       expiresAt }. Store sourceId with the lesson run
 * so Hunter/Christine see the source text in their prompt context.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip";
import {
  parseTextSource,
  inferParseMethod,
  MAX_SOURCE_CHARS,
  type ParsedSource,
} from "@/lib/source_parser";
import type { SourceUploadResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_UPLOAD_BYTES = 256_000; // hard upper bound regardless of char count

const JsonBodySchema = z.object({
  text: z.string().min(10, "Source text needs at least 10 characters"),
  filename: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const ipHash = hashIp(req);
  const contentType = req.headers.get("content-type") ?? "";

  let parsed: ParsedSource;
  let filename: string;

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const result = JsonBodySchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "validation_failed", issues: result.error.issues },
          { status: 400 },
        );
      }
      if (result.data.text.length > MAX_SOURCE_CHARS * 2) {
        return NextResponse.json(
          { error: "too_large", limit: MAX_SOURCE_CHARS * 2 },
          { status: 413 },
        );
      }
      filename = result.data.filename ?? "pasted_text.md";
      parsed = parseTextSource({
        raw: result.data.text,
        parseMethod: inferParseMethod(filename),
      });
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const fileField = form.get("file");
      if (!(fileField instanceof File)) {
        return NextResponse.json({ error: "no_file_provided" }, { status: 400 });
      }
      const file = fileField as File;
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "too_large", limit: MAX_UPLOAD_BYTES },
          { status: 413 },
        );
      }
      filename = file.name;
      const lower = filename.toLowerCase();
      if (lower.endsWith(".pdf")) {
        return NextResponse.json(
          {
            error: "pdf_not_supported_yet",
            hint: "Paste the relevant excerpt into the textarea instead. PDF ingest ships post-launch.",
          },
          { status: 415 },
        );
      }
      if (!lower.endsWith(".txt") && !lower.endsWith(".md") && !lower.endsWith(".markdown")) {
        return NextResponse.json(
          { error: "unsupported_format", allowed: ["txt", "md"] },
          { status: 415 },
        );
      }
      const raw = await file.text();
      parsed = parseTextSource({
        raw,
        parseMethod: inferParseMethod(filename),
      });
    } else {
      return NextResponse.json(
        { error: "unsupported_content_type", accepts: ["application/json", "multipart/form-data"] },
        { status: 415 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "parse_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
  const row = await prisma.sourceUpload.create({
    data: {
      filename,
      contentHash: parsed.contentHash,
      charCount: parsed.charCount,
      parseMethod: parsed.parseMethod,
      textContent: parsed.text,
      expiresAt,
      ipHash,
    },
  });

  const response: SourceUploadResponse = {
    sourceId: row.id,
    excerptPreview: parsed.preview,
    charCount: parsed.charCount,
    parseMethod: parsed.parseMethod as "text" | "markdown" | "pdf_pypdf",
    expiresAt: expiresAt.toISOString(),
  };
  return NextResponse.json(response, { status: 201 });
}
