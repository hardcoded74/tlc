import Image from "next/image";
import Link from "next/link";
import { PersonaAvatar } from "@/components/persona-avatar";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="px-6 pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <p className="text-xs md:text-sm uppercase tracking-widest text-christine-500 font-medium">
            Gemma 4 Good Hackathon &middot; Impact Track
          </p>

          <h1 className="sr-only">
            Teacher&rsquo;s Lesson Creator — Every Teacher Deserves TLC.
          </h1>
          <Image
            src="/logo.png"
            alt="Teacher's Lesson Creator — Every Teacher Deserves TLC."
            width={720}
            height={720}
            priority
            className="mx-auto w-full max-w-sm md:max-w-md h-auto"
          />

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-(--color-muted) leading-relaxed">
            A lesson-building tool powered by{" "}
            <span className="text-ink font-medium">Gemma 4</span> and guided
            by two collaborating specialists. Hand it a topic, a grade level,
            and how long your class runs. Walk away with a complete,
            classroom-ready plan — objective, steps, assessment, teacher
            notes, misconceptions, accommodations, the whole deck.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/create"
              className="px-8 py-3 rounded-md bg-hunter-700 text-white text-lg font-medium hover:bg-hunter-900 transition shadow-sm"
            >
              Try TLC
            </Link>
            <Link
              href="/gallery"
              className="px-8 py-3 rounded-md border border-hunter-300 text-hunter-700 text-lg hover:bg-hunter-50 transition"
            >
              Browse example lessons
            </Link>
          </div>

          <p className="text-xs text-(--color-muted) pt-4">
            No login. No teacher account. Lessons kept for 30 days at a
            private URL.
          </p>
        </div>
      </section>

      {/* Two personas */}
      <section className="px-6 py-16 bg-hunter-50/30 border-y border-hunter-100">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-(--color-muted) font-medium">
              Two specialists, not one generalist
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">
              A lesson is structure <em>and</em> engagement.
              <br />
              TLC treats them as two jobs.
            </h2>
            <p className="text-(--color-muted) leading-relaxed pt-2">
              One-pass AI lessons sound flat because one model is doing every
              job. TLC splits the work. Hunter builds the scaffolding;
              Christine adds the depth. A review layer audits both before the
              final package is assembled.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <article className="rounded-lg border border-hunter-200 bg-paper p-6 space-y-3">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona="hunter" size="lg" />
                <div>
                  <p className="font-serif text-xl">Hunter</p>
                  <p className="text-xs uppercase tracking-wider text-(--color-muted)">
                    Structure &amp; rigor
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                The lesson architect. Drafts the measurable objective, the
                step-by-step sequence, the assessment, the answer key, and
                the time allocations. Direct. Precise. Doesn&rsquo;t soften.
              </p>
              <p className="text-xs text-(--color-muted) pt-1 border-t border-hunter-100">
                Owns: objective, lesson steps, assessment, standards.
              </p>
            </article>

            <article className="rounded-lg border border-christine-200 bg-paper p-6 space-y-3">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona="christine" size="lg" />
                <div>
                  <p className="font-serif text-xl">Christine</p>
                  <p className="text-xs uppercase tracking-wider text-(--color-muted)">
                    Depth &amp; engagement
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                The pedagogue. Writes the hook, the demonstration, the
                discussion prompts, common misconceptions, differentiation,
                and disability accommodations. Warm. Practical. Specific.
              </p>
              <p className="text-xs text-(--color-muted) pt-1 border-t border-christine-100">
                Owns: engagement, demo, teacher notes, accommodations.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-(--color-muted) font-medium">
              How it works
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">
              Three phases. Minutes, not hours.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowStep
              num="1"
              title="You describe the class"
              body="Topic, grade level, class length. Optionally: the standards you're tied to, a source reading, a specific objective you already know you want."
            />
            <HowStep
              num="2"
              title="Hunter + Christine collaborate"
              body="Both build the lesson in parallel. A review layer audits each side for grade fit, source alignment, internal consistency. Then both return to polish."
            />
            <HowStep
              num="3"
              title="You get a package"
              body="A complete lesson with every section labeled grounded / scaffolded / generated so you know exactly which parts trace to your source and which you should review."
            />
          </div>
        </div>
      </section>

      {/* What a lesson contains */}
      <section className="px-6 py-20 bg-christine-50/20 border-t border-christine-100">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-(--color-muted) font-medium">
              What&rsquo;s in a TLC lesson
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">
              Everything a teacher actually uses.
            </h2>
          </div>

          <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 max-w-3xl mx-auto text-sm">
            {[
              "Learning objective",
              "Lesson steps with timing",
              "Materials list",
              "Warm-up / engagement hook",
              "Demonstration (when it fits)",
              "Guided and independent practice",
              "Assessment + answer key",
              "Discussion prompts",
              "Vocabulary",
              "Common misconceptions",
              "Teacher notes",
              "Differentiation",
              "Disability accommodations",
              "Homework (optional)",
              "Standards alignment",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 py-0.5">
                <span className="text-hunter-500 mt-0.5">&#x2713;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="text-center pt-4">
            <Link
              href="/gallery"
              className="inline-block px-6 py-2.5 rounded-md border border-hunter-300 text-hunter-700 text-sm hover:bg-hunter-50 transition"
            >
              See six real lessons &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Open source note */}
      <section className="px-6 py-14">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-serif text-2xl">Open source by design.</h2>
          <p className="text-(--color-muted) leading-relaxed">
            Built for the Gemma 4 Good Hackathon. MIT licensed. Every
            prompt, every schema, every merge rule is in the public repo —
            because a tool teachers use should be inspectable by the people
            who audit it.
          </p>
          <p className="pt-2">
            <a
              href="https://github.com/sam-tgcfl/tlc"
              className="text-hunter-500 underline hover:text-hunter-700"
            >
              github.com/sam-tgcfl/tlc
            </a>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="px-6 py-5 border-b border-hunter-100 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="font-serif text-2xl tracking-tight">TLC</span>
        <span className="hidden sm:inline text-sm text-(--color-muted)">
          Teacher&rsquo;s Lesson Creator
        </span>
      </Link>
      <nav className="flex items-center gap-4 md:gap-6 text-sm">
        <Link href="/gallery" className="hover:text-hunter-500">
          Gallery
        </Link>
        <Link href="/about" className="hover:text-hunter-500">
          About
        </Link>
        <Link
          href="/create"
          className="px-3 py-1.5 md:px-4 md:py-2 rounded-md bg-hunter-700 text-white hover:bg-hunter-900 transition"
        >
          Try TLC
        </Link>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="px-6 py-6 border-t border-hunter-100 text-xs text-(--color-muted) flex items-center justify-between">
      <span>&copy; 2026 TLC contributors &middot; MIT License</span>
      <div className="flex items-center gap-4">
        <Link href="/about" className="hover:text-hunter-500">
          About
        </Link>
        <Link href="/about#privacy" className="hover:text-hunter-500">
          Privacy
        </Link>
        <Link href="/status" className="hover:text-hunter-500">
          Status
        </Link>
      </div>
    </footer>
  );
}

function HowStep({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <article className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-hunter-700 text-white font-serif text-lg flex items-center justify-center">
          {num}
        </span>
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      <p className="text-(--color-muted) leading-relaxed text-sm">{body}</p>
    </article>
  );
}
