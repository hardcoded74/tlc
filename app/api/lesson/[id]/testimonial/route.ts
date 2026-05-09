/**
 * POST /api/lesson/[id]/testimonial
 *
 * Save a teacher's name, school, and short review for a completed
 * lesson. Stored as plain string columns on LessonRun. The lesson
 * page renders the credit + quote when these fields are populated;
 * absence of any of them just hides the section.
 *
 * No auth — anyone with the lesson link can attribute it. That's an
 * accepted hackathon-demo trade-off (judges browsing testimonials
 * are reading whatever the teachers chose to leave).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TestimonialSchema = z.object({
  teacherName: z.string().trim().min(1).max(200),
  teacherSchool: z.string().trim().min(1).max(200),
  teacherReview: z.string().trim().min(1).max(2000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = TestimonialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const run = await prisma.lessonRun.findUnique({ where: { id } });
  if (!run) {
    return NextResponse.json({ error: "lesson not found" }, { status: 404 });
  }
  if (run.status !== "complete") {
    return NextResponse.json(
      { error: "lesson is not complete yet — cannot leave a testimonial" },
      { status: 409 },
    );
  }

  await prisma.lessonRun.update({
    where: { id },
    data: {
      teacherName: parsed.data.teacherName,
      teacherSchool: parsed.data.teacherSchool,
      teacherReview: parsed.data.teacherReview,
      testimonialAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
