import Link from "next/link";
import { TeacherInputForm } from "@/components/teacher-input-form";

export default function CreatePage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Back
        </Link>

        <header className="space-y-2">
          <h1 className="font-serif text-4xl">Create a lesson</h1>
          <p className="text-(--color-muted) leading-relaxed">
            Tell us about the class. Hunter drafts the structure and
            assessment; Christine writes the hook, discussion prompts, and
            teacher notes. The review layer audits both. You get a single
            printable package at the end.
          </p>
        </header>

        <div className="rounded-lg border border-hunter-100 bg-paper p-6 sm:p-8">
          <TeacherInputForm />
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
