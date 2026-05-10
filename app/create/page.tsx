import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TeacherInputForm, type TeacherInputFormInitial } from "@/components/teacher-input-form";
import type { LessonPackage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  let initial: TeacherInputFormInitial | undefined;
  let parent: { id: string; title: string } | null = null;
  let parentMissing = false;

  if (from) {
    const source = await prisma.lessonRun
      .findUnique({
        where: { id: from },
        select: {
          id: true,
          topic: true,
          gradeLevel: true,
          classLength: true,
          subject: true,
          objective: true,
          notes: true,
          finalPackage: true,
          expiresAt: true,
        },
      })
      .catch(() => null);

    if (!source || source.expiresAt < new Date()) {
      parentMissing = true;
    } else {
      const pkg = source.finalPackage as unknown as LessonPackage | null;
      const parentTitle = pkg?.title ?? source.topic;
      parent = { id: source.id, title: parentTitle };
      initial = {
        parentRunId: source.id,
        topic: source.topic,
        gradeLevel: source.gradeLevel,
        classLength: source.classLength ?? 45,
        subject: source.subject ?? "",
        objective: source.objective ?? "",
        notes: source.notes ?? "",
      };
    }
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Back
        </Link>

        <header className="space-y-2">
          <h1 className="font-serif text-4xl">
            {parent ? "Remix a lesson" : "Create a lesson"}
          </h1>
          {parent ? (
            <p className="text-(--color-muted) leading-relaxed">
              Starting from{" "}
              <Link
                href={`/lesson/${parent.id}`}
                className="underline hover:text-hunter-500"
              >
                {parent.title}
              </Link>
              . Tweak anything below — Hunter and Christine will rebuild from
              your changes. The original stays intact.
            </p>
          ) : (
            <p className="text-(--color-muted) leading-relaxed">
              Tell us about the class. Hunter drafts the structure and
              assessment; Christine writes the hook, discussion prompts, and
              teacher notes. The review layer audits both. You get a single
              printable package at the end.
            </p>
          )}
        </header>

        {parentMissing ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The lesson you tried to remix isn&rsquo;t available — it may have
            expired (30-day retention) or been removed. You can still create a
            fresh one below.
          </div>
        ) : null}

        <div className="rounded-lg border border-hunter-100 bg-paper p-6 sm:p-8">
          <TeacherInputForm initial={initial} />
        </div>

        <footer className="text-xs text-(--color-muted) pt-4">
          Lessons are kept for 30 days at a private URL. No login, no teacher
          accounts. See the{" "}
          <Link href="/about#privacy" className="underline hover:text-hunter-500">
            privacy page
          </Link>{" "}
          for the full posture.
        </footer>
      </div>
    </main>
  );
}
