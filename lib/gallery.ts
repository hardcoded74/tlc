/**
 * Gallery data access. Gallery rows in LessonRun are identified by the
 * sentinel ipHash used by prisma/seed.ts.
 */

import { prisma } from "./prisma";
import type { LessonPackage } from "./types";

export const GALLERY_IP_HASH = "__gallery_seed__";

export interface GalleryListItem {
  id: string;
  title: string;
  gradeLevel: string;
  subject: string | null;
  estimatedMinutes: number;
  overview: string;
  groundingLabel: string;
  generatedAt: string;
}

export async function listGalleryLessons(): Promise<GalleryListItem[]> {
  const rows = await prisma.lessonRun.findMany({
    where: { ipHash: GALLERY_IP_HASH, status: "complete" },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .map((row) => {
      const pkg = row.finalPackage as unknown as LessonPackage | null;
      if (!pkg) return null;
      return {
        id: row.id,
        title: pkg.title,
        gradeLevel: pkg.grade_level,
        subject: pkg.subject,
        estimatedMinutes: pkg.estimated_minutes,
        overview: pkg.overview,
        groundingLabel: pkg.source_summary.overall_grounding.replace(/_/g, " "),
        generatedAt: row.createdAt.toISOString(),
      } satisfies GalleryListItem;
    })
    .filter((x): x is GalleryListItem => x !== null);
}
