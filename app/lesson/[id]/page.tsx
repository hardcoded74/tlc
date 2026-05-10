import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip";
import { HANDLE_COOKIE, unpackHandle } from "@/lib/handle";
import { LessonRunView } from "./lesson-run-view";
import { JudgeInspector } from "@/components/judge-inspector";
import type { Testimonial } from "@/components/teacher-testimonial";
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

  const testimonial: Testimonial | null =
    run.teacherName && run.teacherSchool && run.teacherReview
      ? {
          teacherName: run.teacherName,
          teacherSchool: run.teacherSchool,
          teacherReview: run.teacherReview,
          testimonialAt: run.testimonialAt?.toISOString() ?? null,
        }
      : null;

  // Parent + remix lookups for the social layer. Both are best-effort —
  // a missing parent (parent expired before child) renders a soft note
  // instead of breaking the page.
  let parent: { id: string; title: string } | null = null;
  if (run.parentRunId) {
    const parentRow = await prisma.lessonRun
      .findUnique({
        where: { id: run.parentRunId },
        select: { id: true, topic: true, finalPackage: true },
      })
      .catch(() => null);
    if (parentRow) {
      const pkg = parentRow.finalPackage as unknown as LessonPackage | null;
      parent = { id: parentRow.id, title: pkg?.title ?? parentRow.topic };
    }
  }

  const remixRows = await prisma.lessonRun
    .findMany({
      where: { parentRunId: id },
      select: {
        id: true,
        topic: true,
        gradeLevel: true,
        authorHandle: true,
        finalPackage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    })
    .catch(() => []);

  const remixes = remixRows.map((r) => {
    const pkg = r.finalPackage as unknown as LessonPackage | null;
    return {
      id: r.id,
      title: pkg?.title ?? r.topic,
      gradeLevel: r.gradeLevel,
      authorHandle: r.authorHandle,
      createdAt: r.createdAt.toISOString(),
    };
  });

  // Reaction state — has the current viewer (by ipHash) already reacted?
  const requestHeaders = await headers();
  const viewerIpHash = hashIp(requestHeaders);
  const existingReaction = await prisma.reaction
    .findUnique({
      where: {
        lessonRunId_ipHash: { lessonRunId: id, ipHash: viewerIpHash },
      },
      select: { id: true },
    })
    .catch(() => null);

  // Viewer's pseudonymous handle (their cookie, not the lesson author's).
  // Used to prefill the testimonial form's name field.
  const cookieStore = await cookies();
  const viewerHandle = unpackHandle(cookieStore.get(HANDLE_COOKIE)?.value ?? null);

  const initial = {
    id: run.id,
    status: run.status as RunStatus,
    topic: run.topic,
    gradeLevel: run.gradeLevel,
    subject: run.subject,
    classLength: run.classLength,
    createdAt: run.createdAt.toISOString(),
    authorHandle: run.authorHandle,
    parent,
    remixes,
    reactionCount: run.reactionCount,
    viewerHasReacted: existingReaction !== null,
    viewerHandle,
    hunterScaffold: (run.hunterPackage ?? run.hunterBuild) as PersonaScaffold | null,
    christineScaffold: (run.christinePackage ?? run.christineBuild) as PersonaScaffold | null,
    review: run.review as ReviewReport | null,
    finalPackage: run.finalPackage as LessonPackage | null,
    testimonial,
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
