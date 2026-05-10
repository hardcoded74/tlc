import Link from "next/link";
import { listGalleryLessons, type GalleryListItem } from "@/lib/gallery";
import { GalleryGrid } from "@/components/gallery-grid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GalleryPage() {
  let lessons: GalleryListItem[] = [];
  let dbError: string | null = null;
  try {
    lessons = await listGalleryLessons();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Home
        </Link>

        <header className="space-y-3">
          <h1 className="font-serif text-4xl">Gallery</h1>
          <p className="text-(--color-muted) max-w-2xl leading-relaxed">
            Example lessons produced by Hunter and Christine. These are
            kept live so judges can explore the output even if the live
            generation flow is temporarily unavailable. Click any lesson to
            view it, or hit <em>Remix</em> to pre-fill a new lesson from one
            of these.
          </p>
        </header>

        {dbError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Couldn&rsquo;t reach the database. Try again in a moment.
          </div>
        ) : lessons.length === 0 ? (
          <EmptyState />
        ) : (
          <GalleryGrid lessons={lessons} />
        )}

        <div className="pt-6 border-t border-hunter-100">
          <Link
            href="/create"
            className="inline-block px-5 py-2.5 rounded-md bg-hunter-700 text-white text-sm hover:bg-hunter-900 transition"
          >
            Or build your own lesson &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-hunter-200 bg-hunter-50/40 px-6 py-10 text-center">
      <p className="font-serif text-xl">No seeded lessons yet</p>
      <p className="mt-2 text-sm text-(--color-muted)">
        Run <code className="font-mono bg-paper px-1 py-0.5 rounded">npm run db:seed</code>{" "}
        to load example lessons from{" "}
        <code className="font-mono bg-paper px-1 py-0.5 rounded">examples/seed_lessons/</code>.
      </p>
    </div>
  );
}
