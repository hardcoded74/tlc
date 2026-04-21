import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 py-5 border-b border-hunter-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl tracking-tight">TLC</span>
          <span className="text-sm text-(--color-muted)">
            Teacher&rsquo;s Lesson Creator
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/gallery" className="hover:text-hunter-500">
            Gallery
          </Link>
          <Link href="/about" className="hover:text-hunter-500">
            About
          </Link>
          <Link
            href="/create"
            className="px-4 py-2 rounded-md bg-hunter-700 text-white hover:bg-hunter-900 transition"
          >
            Try TLC
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center space-y-8">
          <p className="text-sm uppercase tracking-widest text-christine-500 font-medium">
            Gemma 4 Good Hackathon &middot; Impact Track
          </p>

          <h1 className="font-serif text-5xl md:text-6xl leading-tight">
            Every teacher deserves&nbsp;
            <span className="text-hunter-700">TLC</span>.
          </h1>

          <p className="text-lg text-(--color-muted) leading-relaxed">
            A lesson-building tool powered by{" "}
            <span className="text-ink font-medium">Gemma 4</span> and guided by
            two collaborating personas —{" "}
            <span className="text-hunter-500 font-medium">Hunter</span> for
            structure,{" "}
            <span className="text-christine-500 font-medium">Christine</span>{" "}
            for engagement. Hand it a topic and a grade level; walk away with a
            complete, classroom-ready plan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/create"
              className="px-8 py-3 rounded-md bg-hunter-700 text-white text-lg hover:bg-hunter-900 transition"
            >
              Try TLC
            </Link>
            <Link
              href="/gallery"
              className="px-8 py-3 rounded-md border border-hunter-300 text-hunter-700 text-lg hover:bg-hunter-50 transition"
            >
              Browse the gallery
            </Link>
          </div>

          <p className="text-xs text-(--color-muted) pt-8">
            Open source, MIT licensed &middot;{" "}
            <a
              href="https://github.com/sam-tgcfl/tlc"
              className="underline hover:text-hunter-500"
            >
              GitHub
            </a>
          </p>
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-hunter-100 text-xs text-(--color-muted) flex items-center justify-between">
        <span>&copy; 2026 TLC contributors &middot; MIT License</span>
        <Link href="/about#privacy" className="hover:text-hunter-500">
          Privacy
        </Link>
      </footer>
    </main>
  );
}
