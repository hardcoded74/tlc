# TLC — Teacher's Lesson Creator

**Every Teacher Deserves TLC.**

A Gemma 4-powered lesson-building tool that turns a topic and grade
level into a complete, classroom-ready lesson package — guided by two
collaborating personas, Hunter and Christine.

**[Live demo →](https://tlc-demo.vercel.app)** | **[Source code →](https://github.com/YOUR_HANDLE/tlc)** | **[Demo video →](https://youtu.be/YOUR_ID)** | **[Status page →](https://tlc-demo.vercel.app/status)**

---

## TL;DR

Teachers spend hours a week building lessons from scratch. Most AI tools
give them a draft — a starting point. They still have to write the
activity, build the assessment, figure out the engagement moment, and
assemble everything into something they can actually use.

**TLC finishes the job.** Enter a topic, pick a grade level, and in
under 90 seconds you get a complete teaching kit: lesson plan with
timed sections, materials list, engagement moment, hands-on
demonstration when appropriate, guided and independent practice,
assessment with answer key, and teacher notes on common misconceptions.

Two Gemma 4-powered personas run in parallel: **Hunter** handles
structure and rigor; **Christine** handles depth and engagement. A
review phase audits both contributions before packaging. Teachers
watch the collaboration happen live.

---

## The Problem

Ask any teacher how they spend their evenings and weekends. Lesson prep
is a big chunk. Not because teachers are slow — because the job is big:

- A lesson needs a clear learning objective
- The objective needs an assessment that actually tests it
- The assessment needs an answer key
- The lesson needs engagement, or students check out in the first five
  minutes
- Complicated topics need a demo or hands-on example
- Every concept has predictable student misconceptions the teacher has
  to anticipate
- The whole thing needs to fit in a specific class length with time
  math that works
- If the school requires standards alignment, that's another layer

Most teacher-facing AI tools today stop at "here's a lesson outline,
good luck with the rest." That's not finishing the job. That's handing
the teacher a better-shaped problem.

---

## What TLC Does

TLC takes two inputs — a topic and a grade level — and produces a
complete lesson package.

**Minimum input:**
- Topic ("photosynthesis")
- Grade level ("5th grade")

**Recommended input:**
- Class length
- Subject area
- Learning objective
- Source material (paste text or upload `.txt`, `.md`, `.pdf`)

**Optional input:**
- Teaching notes, classroom constraints
- Desired assessment type
- Differentiation / homework / enrichment opt-ins

**Output — every lesson package includes:**
- Lesson title and measurable objective
- Grade level and estimated time
- Brief overview
- Concrete materials list (not "resources" — actual supplies)
- Step-by-step plan with timed sections
- At least one engagement moment (warm-up, discussion, partner activity)
- A demonstration or hands-on example when the topic supports one
- Guided practice (paired/group) and independent practice
- Assessment — quiz, exit ticket, worksheet, or comprehension check
- Answer key with rubric notes
- Teacher notes on common misconceptions
- Discussion prompts for deeper thinking
- Vocabulary list with definitions
- Optional: differentiation for struggling/advanced learners, homework,
  enrichment activity, standards alignment

Every content section is labeled with its provenance: `grounded`
(traces directly to teacher-provided source), `scaffolded` (source
shaped the structure but wording is generated), or `generated` (open
generation, flagged for teacher review).

The teacher walks away with a document they could print and teach from
tomorrow morning.

---

## The Two-Persona Design

TLC uses two Gemma 4 personas that collaborate — not cosmetically, but
structurally.

### Hunter — Structure and Rigor

Hunter is the system's architect. Hunter owns:
- The learning objective (clear, measurable)
- The lesson sequence (does each step build on the prior?)
- The assessment (does it test the stated objective?)
- The answer key (is it correct and consistent?)
- The time math (do all the steps add up to the class length?)
- Standards alignment when provided

### Christine — Depth and Engagement

Christine is the system's pedagogue. Christine owns:
- The engagement moment (a real hook, not "students listen")
- The demonstration (realistic supplies, not lab equipment)
- Teacher notes on how to deliver the lesson
- Discussion prompts that provoke real student thinking
- Differentiation for struggling and advanced learners
- Common misconceptions to watch for

### Why Two Personas

One Gemma 4 call prompted to "write a lesson plan" produces generic
output. The model is trained to be helpful in general, not rigorous in
particular.

Two specialized calls — one prompted to care about structure, one
prompted to care about engagement — produce different content. When
they're merged by explicit rules (Hunter wins on structural fields,
Christine wins on pedagogical ones, unions on shared fields), the
result has both the rigor of a department chair and the practicality of
an experienced classroom teacher.

The two personas aren't a story. They're an architecture decision with
a visible product artifact: every section in the final lesson is
attributable to one or the other (or the review phase), and the
teacher can see exactly who wrote what.

---

## How the Three-Phase Workflow Works

```
  PHASE 1: BUILD  (parallel)
  ├── Hunter call    → structural scaffold (JSON via tool call)
  └── Christine call → depth scaffold (JSON via tool call)
                │
                ▼
  PHASE 2: REVIEW  (single call)
  └── Review call → audits both scaffolds:
        · grade-level fit
        · structure & sequence
        · source alignment
        · assessment alignment with objective
        · engagement quality
        · completeness
        → emits issues with severity (must_fix / should_fix / nice_to_fix)
                │
                ▼
  PHASE 3: PACKAGE  (parallel)
  ├── Hunter call    → finalized structural sections (with review findings applied)
  └── Christine call → finalized depth sections (with review findings applied)
                │
                ▼
  MERGE
  └── Deterministic merge by field ownership → final LessonPackage
```

**Total: 5 Gemma 4 calls per lesson. ~60–90 seconds end-to-end.**

Each call uses Gemma 4's native function-calling to emit structured
JSON that's validated by Zod before storage. If validation fails, one
retry with the error appended. No silent fallbacks — if Gemma can't
produce valid output, the user sees a clear error, not a broken lesson.

---

## The Source-Grounding Story

Accuracy is the hardest thing in AI-generated education content. TLC
takes an honest posture:

**What TLC does:**
- Accepts teacher-provided source material (pasted text or `.txt`,
  `.md`, `.pdf` upload)
- Prefers teacher source for factual content when provided
- Labels every content section with its source origin
- Retains source material for exactly 1 hour, then deletes it
- Surfaces the labels inline — every lesson section shows a pill
  indicating `grounded`, `scaffolded`, or `generated`

**What TLC doesn't do:**
- Claim fact-checked accuracy
- Validate scientific or historical correctness
- Replace a teacher's final review of output before classroom use

The final accuracy check is always the teacher. That's not a limitation
— it's the design. Teachers are education's accuracy layer; TLC
provides the scaffolding.

---

## Architecture

TLC is a single Next.js 15 application running TypeScript end-to-end,
backed by Postgres (Neon) and Google AI Studio's Gemma 4 API.

### Stack summary

| Layer | Choice |
|---|---|
| Language | TypeScript (frontend + API routes) |
| Framework | Next.js 15, App Router |
| UI | Tailwind + shadcn/ui + Lucide icons |
| Hosting | Vercel |
| Database | Neon Postgres + Prisma ORM |
| AI | Google AI Studio, model `gemma-4-e4b-it` |
| Streaming | Server-Sent Events (Node runtime) |
| Source parsing | pdf-parse (Node) |
| Observability | Vercel logs + Sentry + BetterStack |

### Why this stack

- **One language** means the repo is inspectable top-to-bottom in a
  single mental model — useful for judges scanning the code
- **One deploy target** (Vercel) means no service coordination risk
  during judging
- **Official Gemma 4 API** means the response payload explicitly
  attributes to Gemma 4 — auditable in judge mode (`?judge=1`)
- **Serverless Postgres** means generated lessons persist with
  branch-per-environment isolation; no data-loss on deploys

### Data flow

1. Teacher submits `/create` form → validated via Zod → `POST /api/lesson/create`
2. Server creates `LessonRun` row → kicks off async `orchestrate()` → returns `run_id`
3. Frontend opens SSE connection to `/api/lesson/stream/{run_id}`
4. Orchestrator runs three phases, persisting each phase output to DB,
   emitting SSE events for every meaningful state change
5. Final package stored as JSON in `LessonRun.finalPackage`
6. Frontend displays the package via tabbed UI; download endpoints
   serve `.md`, `.html`, `.json` on demand

### Privacy posture

- No user accounts
- No IP storage (only daily-salted hashes for rate limiting)
- Source uploads: 1-hour TTL, then deleted
- Generated lessons: 30-day TTL, then pruned
- All retention policies documented on the public `/about#privacy` page

Full architecture documentation: [ARCHITECTURE.md in the repo](https://github.com/YOUR_HANDLE/tlc/blob/main/ARCHITECTURE.md)

---

## Structured Output via Tool Calling

Every Gemma 4 call emits a strict JSON shape via function calling. The
full TypeScript schema lives in `lib/types.ts`; the Zod validators in
`lib/validators.ts`.

Representative excerpt:

```typescript
export interface LessonPackage {
  schema_version: "1.0";
  title: string;
  objective: string;
  grade_level: string;
  estimated_minutes: number;
  overview: string;
  materials: Material[];
  lesson_steps: LessonStep[];
  engagement: Engagement;
  demo: Demonstration | null;
  assessment: Assessment;
  teacher_notes: string | null;
  discussion_prompts: DiscussionPrompt[];
  misconceptions: Misconception[];
  differentiation: Differentiation | null;
  // ... plus source_summary, generated_by provenance fields
}
```

Every content sub-type carries a required `source_origin` field. If
Gemma's output doesn't include it, Zod rejects the payload, we retry
once with the error context, and if it still fails we surface a clean
error to the UI. No silent fallbacks.

Full schema: [SCHEMA.md in the repo](https://github.com/YOUR_HANDLE/tlc/blob/main/SCHEMA.md)

---

## Live Demo

**[https://tlc-demo.vercel.app](https://tlc-demo.vercel.app)**

Judges can:
- Create a lesson from scratch with any topic and grade level
- Browse pre-generated example lessons in `/gallery` (works even if
  live generation is degraded)
- Check `/status` for real-time system metrics
- Use `?judge=1` on `/create` to see the inspector panel with phase
  timings, token usage, raw tool-call JSON, and Gemma API request IDs

The demo is rate-limited to 10 lessons/hour per IP. Judges who want
higher throughput can contact [YOUR_EMAIL] for a whitelist.

---

## What You See When You Open the Demo

1. **Landing page** — the pitch, the three-card intro to Hunter /
   Christine / Gemma 4, a "Create a Lesson" CTA
2. **Create flow** — a single-screen form (topic, grade, optional
   source upload, optional advanced settings)
3. **Collaboration panel** — when you submit, the screen splits into
   two panels showing Hunter and Christine contributing in real time.
   Each persona's card streams bullet items as Gemma 4 emits them.
4. **Review report** — Phase 2 output with grade fit, source
   alignment, and any issues flagged by severity
5. **Final lesson package** — tabbed view (Plan / Materials /
   Activities / Assessment / Notes) with download buttons for
   Markdown, HTML, or JSON
6. **Shareable URL** — every lesson gets a permanent `/lesson/[id]`
   link for teachers to bookmark or share

---

## Example: Photosynthesis, 5th Grade

Input:
- Topic: "Photosynthesis"
- Grade: 5th grade
- Class length: 45 minutes
- Source: NGSS 5-LS1-1 excerpt (pasted)

Output (summary):
- **Title:** "Photosynthesis: How Plants Make Their Own Food (And Ours)"
- **Objective:** Students identify the three inputs of photosynthesis
  and the two outputs, and explain why plants matter for the air we
  breathe
- **Lesson steps:** 6 timed steps totaling exactly 45 minutes
  (5 warm-up + 10 intro + 8 demo + 12 paired practice + 5 reveal + 5
  exit ticket)
- **Engagement:** partner discussion — "If plants make their own food
  from sunlight, water, and air, why do farmers water their crops?"
- **Demo:** seal a plastic bag around one leaf of a live plant at the
  start of class; observe condensation at the end as evidence of
  photosynthesis
- **Assessment:** 3-question exit ticket with answer key and rubric
  notes
- **Teacher notes:** flags the "plants don't eat dirt" misconception and
  how to address it
- **Differentiation:** struggling-learner strategies + advanced
  extension question about winter survival

The full example lesson is permanently available at
[/lesson/example-photosynthesis](https://tlc-demo.vercel.app/lesson/example-photosynthesis)
and in the gallery.

---

## What We Built in 27 Days

- Week 1 — Foundation: Next.js scaffold, Vercel + Neon deployment,
  Google AI Studio integration, three-phase orchestration running
  end-to-end as JSON
- Week 2 — Core flow: teacher input form, live-streaming persona panel,
  review report UI, tabbed lesson package viewer, source upload pipeline,
  download endpoints (`.md` / `.html` / `.json`)
- Week 3 — Polish: landing page, gallery with 6 pre-generated lessons,
  public status page, judge mode inspector, visual design pass
- Week 4 — Submission: demo video, screenshots, this writeup

Full timeline breakdown: [BUILD_PLAN.md](https://github.com/YOUR_HANDLE/tlc/blob/main/BUILD_PLAN.md)

---

## What We Chose Not to Build

Deliberate cuts to keep the MVP focused:

- Teacher accounts / login
- Lesson history, save / reuse (beyond the unguessable URL)
- LMS integrations (Google Classroom, Canvas, etc.)
- Real-time collab between teachers
- Slide deck generation
- Standards auto-alignment with cross-referenced databases
- URL source fetch
- Image / OCR-based source ingestion
- `.docx` upload
- Per-teacher preference profiles

Each of these is a legitimate future feature. None of them are what
proves the concept.

---

## Stretch Roadmap

Things we'd build if TLC became a real product:

- **Printable worksheet generation** — output that goes straight to
  paper with proper page breaks, student name fields, and answer space
- **Lesson revision mode** — edit a generated lesson and re-run specific
  phases (e.g., "regenerate the assessment with more open-response
  questions")
- **Curriculum pack ingestion** — upload an entire unit's source
  material once, then generate multiple linked lessons from it
- **Standards cross-reference** — automatically match generated content
  to state standards databases (NGSS, Common Core, state-specific)
- **Slide deck generation** — emit a Google Slides-compatible output
  alongside the lesson
- **Assessment feedback loop** — if a teacher marks a question
  "students didn't understand this," TLC regenerates just that item

---

## Why Gemma 4

Gemma 4's strengths map directly onto what lesson building needs:

- **Multi-step instruction-following** — the three-phase workflow is
  exactly the kind of structured multi-call orchestration Gemma 4
  handles cleanly
- **Native tool-calling** — structured JSON output without regex
  parsing or prompt engineering around format
- **Coherent long-form generation** — producing a full lesson package
  (often 2,000+ tokens) without drift
- **Fast inference** — interactive demo latency (~10-20s per persona
  call) is viable on the free AI Studio tier
- **Open model family** — the open weights let us reason about the
  model's behavior and debug prompts against local copies during
  development

TLC is a demonstration of Gemma 4 as a *conductor* of a specialist
workflow rather than a single generalist AI. That framing makes the
product stronger: two personas, three phases, source grounding,
structured output — each layer uses Gemma 4 for what it's best at.

---

## How This Helps Teachers

Education is a profession where time is the hardest resource to protect.
Teachers build lessons in stolen evening hours, weekend stretches,
between students. Anything that takes a 90-minute task and makes it a
5-minute task is worth using.

TLC does specifically one thing well: it produces a complete lesson
package — not a draft, not an outline — from a topic and grade level.
Every output is designed for teacher review before classroom use. The
teacher is the last accuracy check, always.

Every teacher deserves TLC.

---

## Credits

- **Built by:** [Sam] · [sam@tgcfl.com]
- **Model:** Gemma 4 (`gemma-4-e4b-it`) via Google AI Studio
- **Personas:** Hunter (structure & rigor), Christine (depth &
  engagement)
- **UI illustrations:** [credit if commissioned; otherwise omit]
- **Source parsing:** `pdf-parse` (MIT)
- **Framework:** Next.js 15, Tailwind, shadcn/ui, Prisma
- **Hosting:** Vercel (frontend + API), Neon (database), Google AI
  Studio (model)

**License:** MIT. Open source. Fork it, build on it, improve it.

**Repo:** [github.com/YOUR_HANDLE/tlc](https://github.com/YOUR_HANDLE/tlc)

**Demo video:** [youtube.com/watch?v=YOUR_ID](https://youtube.com/watch?v=YOUR_ID)

**Live demo:** [tlc-demo.vercel.app](https://tlc-demo.vercel.app)

---

## For Judges: Quick Links

- **[Live demo](https://tlc-demo.vercel.app)** — try it yourself
- **[Judge mode](https://tlc-demo.vercel.app/create?judge=1)** —
  inspector panel with timings, tokens, raw tool-call JSON, Gemma API
  request IDs
- **[Gallery](https://tlc-demo.vercel.app/gallery)** — 6 pre-generated
  example lessons (always available, no live generation required)
- **[Status page](https://tlc-demo.vercel.app/status)** — uptime,
  metrics, recent activity
- **[Source code](https://github.com/YOUR_HANDLE/tlc)** — MIT, read
  top-to-bottom
- **[Architecture doc](https://github.com/YOUR_HANDLE/tlc/blob/main/ARCHITECTURE.md)** — technical deep dive
- **[Schema doc](https://github.com/YOUR_HANDLE/tlc/blob/main/SCHEMA.md)** —
  structured output contract
- **[Persona design](https://github.com/YOUR_HANDLE/tlc/blob/main/PROMPTS.md)** — Hunter + Christine system prompts
- **[Demo video](https://youtube.com/watch?v=YOUR_ID)** — 2:30 walkthrough

---

*TLC. Every Teacher Deserves TLC.*
