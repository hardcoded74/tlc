/**
 * Gallery seeder. Loads every JSON file in examples/seed_lessons/ and
 * upserts a LessonRun row for each. Gallery rows are identified by
 * ipHash === "__gallery_seed__" so the /gallery page can list them
 * regardless of topic or date.
 *
 * Run with: npm run db:seed
 *
 * Safe to re-run: each JSON file maps to a deterministic LessonRun id
 * derived from the filename, so re-seeding overwrites instead of duplicating.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { createHash } from "node:crypto";
import { LessonPackageSchema } from "../lib/validators";
import type { LessonPackage } from "../lib/types";

const SEED_DIR = join(process.cwd(), "examples", "seed_lessons");
const GALLERY_IP_HASH = "__gallery_seed__";
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function idFromFilename(filename: string): string {
  // Deterministic UUID from the filename, so re-seeding updates in place.
  const hash = createHash("sha1").update(`gallery:${filename}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16), // Version 5 UUID marker
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

async function loadLesson(filePath: string): Promise<LessonPackage> {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const result = LessonPackageSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid seed lesson ${basename(filePath)}: ${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }
  return result.data;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    let files: string[];
    try {
      files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
    } catch (err) {
      console.error(`[seed] Couldn't read ${SEED_DIR}:`, err);
      process.exit(1);
    }

    if (files.length === 0) {
      console.log(`[seed] No JSON files in ${SEED_DIR}. Nothing to seed.`);
      return;
    }

    console.log(`[seed] Loading ${files.length} gallery lesson(s) from ${SEED_DIR}`);

    for (const file of files) {
      const filePath = join(SEED_DIR, file);
      const id = idFromFilename(basename(file, extname(file)));
      try {
        const pkg = await loadLesson(filePath);
        await prisma.lessonRun.upsert({
          where: { id },
          create: {
            id,
            status: "complete",
            topic: pkg.title,
            gradeLevel: pkg.grade_level,
            classLength: pkg.estimated_minutes,
            subject: pkg.subject,
            objective: pkg.objective,
            finalPackage: pkg as unknown as object,
            ipHash: GALLERY_IP_HASH,
            expiresAt: new Date(Date.now() + SIX_MONTHS_MS),
          },
          update: {
            topic: pkg.title,
            gradeLevel: pkg.grade_level,
            classLength: pkg.estimated_minutes,
            subject: pkg.subject,
            objective: pkg.objective,
            finalPackage: pkg as unknown as object,
            expiresAt: new Date(Date.now() + SIX_MONTHS_MS),
          },
        });
        console.log(`[seed] ✓ ${file} → ${id}`);
      } catch (err) {
        console.error(`[seed] ✗ ${file}:`, err);
      }
    }

    const count = await prisma.lessonRun.count({
      where: { ipHash: GALLERY_IP_HASH },
    });
    console.log(`[seed] done. ${count} gallery lesson(s) in DB.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
