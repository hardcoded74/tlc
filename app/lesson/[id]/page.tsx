import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonRunView } from "./lesson-run-view";
import { JudgeInspector } from "@/components/judge-inspector";
import type { PersonaScaffold, ReviewReport, LessonPackage, RunStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ judge?: string }>;
}) {
  const { id } = await params;
  const { judge } = await searchParams;
  const judgeMode = judge === "1";

  const run = await prisma.lessonRun
    .findUnique({ where: { id } })
    .catch(() => null);

  if (!run) notFound();
  if (run.expiresAt < new Date()) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-sm text-hunter-500 hover:underline">
            &larr; Home
          </Link>
          <h1 className="font-serif text-3xl mt-4">Lesson expired</h1>
          <p className="mt-2 text-(--color-muted)">
            This lesson&rsquo;s 30-day retention window has ended.{" "}
            <Link href="/create" className="underline hover:text-hunter-500">
              Create a new one
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  const initial = {
    id: run.id,
    status: run.status as RunStatus,
    topic: run.topic,
    gradeLevel: run.gradeLevel,
    subject: run.subject,
    classLength: run.classLength,
    createdAt: run.createdAt.toISOString(),
    hunterScaffold: (run.hunterPackage ?? run.hunterBuild) as PersonaScaffold | null,
    christineScaffold: (run.christinePackage ?? run.christineBuild) as PersonaScaffold | null,
    review: run.review as ReviewReport | null,
    finalPackage: run.finalPackage as LessonPackage | null,
  };

  return (
    <main className="flex-1 px-6 py-8 bg-hunter-50/20">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Home
        </Link>

        <LessonRunView initial={initial} />
        {judgeMode && <JudgeInspector runId={run.id} />}
      </div>
    </main>
  );
}
