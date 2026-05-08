import Link from "next/link";
import { PersonaAvatar } from "@/components/persona-avatar";

export default function AboutPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Home
        </Link>

        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-christine-500 font-medium">
            About TLC
          </p>
          <h1 className="font-serif text-4xl leading-tight">
            A lesson-building tool with a point of view.
          </h1>
          <p className="text-lg text-(--color-muted) leading-relaxed">
            TLC was built for the Gemma 4 Good Hackathon (Impact Track). It
            answers a specific question: what does an AI lesson-builder look
            like when it&rsquo;s scoped to a single honest job and given
            structure instead of chat?
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Why two Teacher&rsquo;s Assistants</h2>
          <p className="leading-relaxed">
            One-pass lesson generation is usually flat. Every section sounds
            the same because one model is doing every job. TLC splits the
            work across two specialist Teacher&rsquo;s Assistants:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-hunter-100 bg-hunter-50/30 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona="hunter" size="lg" />
                <div>
                  <p className="font-serif text-xl text-hunter-700">Hunter</p>
                  <p className="text-xs uppercase tracking-widest text-(--color-muted)">
                    Structure &amp; rigor
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                The lesson architect. Objective, lesson steps, assessment,
                answer key, time allocation. Direct. Precise. Doesn&rsquo;t
                soften.
              </p>
            </div>
            <div className="rounded-lg border border-christine-100 bg-christine-50/30 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona="christine" size="lg" />
                <div>
                  <p className="font-serif text-xl text-christine-700">Christine</p>
                  <p className="text-xs uppercase tracking-widest text-(--color-muted)">
                    Depth &amp; engagement
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                The pedagogue. Engagement, demonstrations, teacher notes,
                discussion prompts, misconception recovery. Warm. Practical.
                Specific.
              </p>
            </div>
          </div>
          <p className="leading-relaxed">
            They&rsquo;re not style skins on the same call. They&rsquo;re
            separate Gemma 4 invocations with separate system prompts and
            separate ownership areas. A review layer audits both before the
            final package is assembled.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">What Gemma 4 does here</h2>
          <p className="leading-relaxed">
            Every lesson takes five Gemma 4 calls: two in the Build phase
            (Hunter and Christine in parallel), one in the Review phase, two
            in the Package phase. All use function-calling so the output is
            structured JSON, not free text. If a call doesn&rsquo;t honor
            the schema, we retry once with the validation error in the
            prompt. If that also fails, we surface a clean error — we never
            fabricate output.
          </p>
          <p className="leading-relaxed">
            Every content field in every lesson carries a{" "}
            <code className="font-mono text-sm bg-hunter-50 px-1 py-0.5 rounded">
              source_origin
            </code>{" "}
            label: <em>grounded</em> (traces to teacher&rsquo;s source),{" "}
            <em>scaffolded</em> (source shaped structure), or{" "}
            <em>generated</em> (open generation — teacher should review).
            Teachers see the labels inline. Transparency over magic.
          </p>
        </section>

        <section className="space-y-4" id="privacy">
          <h2 className="font-serif text-2xl">Privacy</h2>
          <ul className="space-y-3 list-disc pl-5 leading-relaxed">
            <li>
              <strong>No login.</strong> No teacher accounts, no emails
              collected, no tracking.
            </li>
            <li>
              <strong>Lessons kept for 30 days.</strong> Each lesson lives
              at a private UUID URL. After 30 days it&rsquo;s deleted. You
              can share the URL freely while it exists.
            </li>
            <li>
              <strong>Uploaded source material kept for 1 hour.</strong> If
              you upload a PDF or paste source text, it&rsquo;s used to
              build your lesson and then deleted. A content hash is kept
              briefly for deduplication but never the text.
            </li>
            <li>
              <strong>IPs never stored raw.</strong> Rate limiting uses a
              daily-salted SHA-256 hash — it&rsquo;s stable for you for 24
              hours, not reversible to an IP, and rotates out.
            </li>
            <li>
              <strong>All code is open source.</strong> MIT license.
              Everything — schema, prompts, orchestration — is in the{" "}
              <a
                href="https://github.com/sam-tgcfl/tlc"
                className="underline hover:text-hunter-500"
              >
                public repo
              </a>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Credits</h2>
          <p className="leading-relaxed">
            Built for the{" "}
            <a
              href="https://kaggle.com/"
              className="underline hover:text-hunter-500"
            >
              Gemma 4 Good Hackathon
            </a>
            , Impact Track. Model: Gemma 4 via Google AI Studio. Stack:
            Next.js + Tailwind + Prisma + Neon Postgres + Vercel. Two
            Teacher&rsquo;s Assistants, one goal: teachers get a lesson
            they can teach tomorrow.
          </p>
        </section>

        <footer className="pt-8 border-t border-hunter-100 text-xs text-(--color-muted) flex items-center justify-between">
          <span>&copy; 2026 TLC contributors &middot; MIT License</span>
          <Link href="/create" className="hover:text-hunter-500">
            Try TLC &rarr;
          </Link>
        </footer>
      </div>
    </main>
  );
}
