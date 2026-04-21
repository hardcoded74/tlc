/**
 * GET /api/lesson/:id/download?format=md|html|json
 *
 * Serves the finalPackage as a downloadable file. 404 if the run isn't
 * complete yet; 410 if expired.
 */

import { prisma } from "@/lib/prisma";
import { toMarkdown, toHtml, toJson } from "@/lib/export";
import type { LessonPackage } from "@/lib/types";
import { LessonPackageSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Format = "md" | "html" | "json";

function resolveFormat(v: string | null): Format {
  if (v === "html") return "html";
  if (v === "json") return "json";
  return "md";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "lesson";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = resolveFormat(url.searchParams.get("format"));

  const run = await prisma.lessonRun.findUnique({ where: { id } });
  if (!run) return new Response("not found", { status: 404 });
  if (run.expiresAt < new Date()) return new Response("expired", { status: 410 });
  if (run.status !== "complete" || !run.finalPackage) {
    return new Response("not ready", { status: 409 });
  }

  // Validate stored package against the schema before exporting. If
  // something's corrupt, return 500 rather than serve garbage.
  const parsed = LessonPackageSchema.safeParse(run.finalPackage);
  if (!parsed.success) {
    return new Response(`invalid package: ${JSON.stringify(parsed.error.issues).slice(0, 300)}`, {
      status: 500,
    });
  }
  const pkg: LessonPackage = parsed.data;

  const slug = slugify(pkg.title);

  if (format === "md") {
    return new Response(toMarkdown(pkg), {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.md"`,
      },
    });
  }
  if (format === "html") {
    return new Response(toHtml(pkg), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.html"`,
      },
    });
  }
  return new Response(
    toJson(pkg, {
      runId: run.id,
      generatedAt: run.updatedAt.toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.json"`,
      },
    },
  );
}
