import Link from "next/link";

export default function CreatePage() {
  return (
    <main className="flex-1 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Back
        </Link>
        <h1 className="font-serif text-4xl">Create a lesson</h1>
        <p className="text-(--color-muted)">
          The teacher input form and the two-persona live panel land here on
          Day 8 / Day 9 of the build plan. For now this is a placeholder so
          the landing page&rsquo;s &quot;Try TLC&quot; button resolves instead
          of 404ing.
        </p>

        <div className="rounded-lg border border-hunter-100 bg-hunter-50/40 p-6 text-sm">
          <p className="font-medium">Under construction</p>
          <p className="text-(--color-muted) mt-1">
            Backend API is live at{" "}
            <code className="font-mono text-xs">/api/lesson/create</code>. UI
            comes together in Week 2.
          </p>
        </div>
      </div>
    </main>
  );
}
