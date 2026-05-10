/**
 * Gallery data access. Gallery rows in LessonRun are identified by the
 * sentinel ipHash used by prisma/seed.ts.
 */

import { prisma } from "./prisma";
import type { LessonPackage } from "./types";

export const GALLERY_IP_HASH = "__gallery_seed__";

export type GradeBand = "K-2" | "3-5" | "6-8" | "9-12" | "adult";
export type LengthBucket = "≤30" | "30-60" | "60+";

export interface GalleryListItem {
  id: string;
  title: string;
  gradeLevel: string;
  gradeBand: GradeBand;
  subject: string | null;
  estimatedMinutes: number;
  lengthBucket: LengthBucket;
  overview: string;
  groundingLabel: string;
  generatedAt: string;
  reactionCount: number;
  remixCount: number;
}

const GRADE_BAND_RULES: Array<{ test: (g: string) => boolean; band: GradeBand }> = [
  { test: (g) => /kindergarten|^k(\b|inder)|1st|2nd/i.test(g), band: "K-2" },
  { test: (g) => /3rd|4th|5th/i.test(g), band: "3-5" },
  { test: (g) => /6th|7th|8th/i.test(g), band: "6-8" },
  { test: (g) => /9th|10th|11th|12th/i.test(g), band: "9-12" },
  { test: (g) => /college|adult/i.test(g), band: "adult" },
];

export function gradeBandFor(gradeLevel: string): GradeBand {
  for (const rule of GRADE_BAND_RULES) {
    if (rule.test(gradeLevel)) return rule.band;
  }
  return "K-2";
}

export function lengthBucketFor(minutes: number): LengthBucket {
  if (minutes <= 30) return "≤30";
  if (minutes <= 60) return "30-60";
  return "60+";
}

export async function listGalleryLessons(): Promise<GalleryListItem[]> {
  const rows = await prisma.lessonRun.findMany({
    where: { ipHash: GALLERY_IP_HASH, status: "complete" },
    orderBy: { createdAt: "desc" },
  });

  const ids = rows.map((r) => r.id);

  // One groupBy to get remix counts for the whole gallery set in a single
  // query — preferable to N findMany calls for the obvious reasons.
  const remixCounts =
    ids.length > 0
      ? await prisma.lessonRun.groupBy({
          by: ["parentRunId"],
          where: { parentRunId: { in: ids } },
          _count: { _all: true },
        })
      : [];
  const remixCountByParent = new Map<string, number>();
  for (const r of remixCounts) {
    if (r.parentRunId) remixCountByParent.set(r.parentRunId, r._count._all);
  }

  return rows
    .map((row) => {
      const pkg = row.finalPackage as unknown as LessonPackage | null;
      if (!pkg) return null;
      return {
        id: row.id,
        title: pkg.title,
        gradeLevel: pkg.grade_level,
        gradeBand: gradeBandFor(pkg.grade_level),
        subject: pkg.subject,
        estimatedMinutes: pkg.estimated_minutes,
        lengthBucket: lengthBucketFor(pkg.estimated_minutes),
        overview: pkg.overview,
        groundingLabel: pkg.source_summary.overall_grounding.replace(/_/g, " "),
        generatedAt: row.createdAt.toISOString(),
        reactionCount: row.reactionCount,
        remixCount: remixCountByParent.get(row.id) ?? 0,
      } satisfies GalleryListItem;
    })
    .filter((x): x is GalleryListItem => x !== null);
}
