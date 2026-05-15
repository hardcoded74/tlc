# TLC — Teacher's Lesson Creator

**Every Teacher Deserves TLC.**

A Gemma 4-powered lesson-building tool that turns a topic and grade
level into a complete, classroom-ready lesson package — guided by two
collaborating Teacher's Assistants, Hunter and Christine.

**[Live demo →](https://tlc-demo.vercel.app)** | **[Source code →](https://github.com/hardcoded74/tlc)** | **[Status page →](https://tlc-demo.vercel.app/status)**

*Demo video link will be added when the submission video is published.*

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

Two Gemma 4-powered Teacher's Assistants run in parallel: **Hunter** handles
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
- Source material (paste text or upload `.txt`, `.md`)

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

TLC uses two Gemma 4-powered Teacher's Assistants that collaborate — not cosmetically, but
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

The two Teacher's Assistants aren't a story. They're an architecture decision with
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
  PHASE 2: REVIEW  +  SOURCE VERIFICATION  (parallel)
  ├── Review call → audits both scaffolds:
  │     · grade-level fit
  │     · structure & sequence
  │     · source alignment
  │     · assessment alignment with objective
  │     · engagement quality
  │     · completeness
  │     → emits issues with severity (must_fix / should_fix / nice_to_fix)
  └── Verifier (Wikipedia + Wikidata in parallel) →
        · cross-references every vocabulary term + misconception
        · batched Gemma fact-check on the excerpts
        · contradicted claims become must_fix issues
                │
                ▼
  REGENERATE-ON-MUST-FIX  (bounded, 1 retry max)
  └── If review or verifier flagged must_fix issues, re-run Build with
      review findings + contradicted-claim source excerpts spliced in.
                │
                ▼
  PHASE 3: PACKAGE  (parallel)
  ├── Hunter call    → finalized structural sections (delta only)
  └── Christine call → finalized depth sections (delta only)
                │
                ▼
  MERGE  +  STANDARDS-CODE VALIDATION
  └── Deterministic merge by field ownership; cited NGSS / Common
      Core codes regex-validated against published formats; final
      verification report + LessonPackage persisted
```

**Total: 5–7 Gemma 4 calls per lesson** (5 base + 1 fact-check + 2
regenerate when triggered). **~60–90 seconds end-to-end** on the
no-regenerate path; ~90–120s when regenerate fires.

Each call uses Gemma 4's native function-calling to emit structured
JSON that's validated by Zod before storage. If validation fails, one
retry with the error appended. No silent fallbacks — if Gemma can't
produce valid output, the user sees a clear error, not a broken lesson.

---

## The Source-Grounding Story

Accuracy is the hardest thing in AI-generated education content. TLC
takes an honest posture:

**What TLC does:**
- Accepts teacher-provided source material (pasted text or `.txt` /
  `.md` upload)
- Prefers teacher source for factual content when provided
- Labels every content section with its source origin
  (`grounded`, `scaffolded`, or `generated`)
- Cross-references vocabulary terms and misconception corrections
  against **Wikipedia and Wikidata** in parallel — every claim that
  has a public-source counterpart gets a "Verified" badge linking to
  the reference
- Validates cited NGSS / Common Core codes against published formats
- Treats clear contradictions between lesson content and trusted
  sources as `must_fix` issues; the bounded regenerate loop receives
  the source excerpts and rewrites the affected fields
- Retains uploaded source material for exactly 1 hour, then deletes it
- Surfaces the labels inline — every lesson section shows a pill
  indicating its origin, plus a separate verification block on the
  Review panel

**What TLC doesn't do:**
- Claim final authoritative correctness — Wikipedia is also wrong
  sometimes; verification surfaces *checkability*, not omniscience
- Validate every claim — vocabulary definitions and misconception
  corrections are the highest-signal targets and the only ones we
  cross-reference today
- Replace a teacher's final review of output before classroom use

The final accuracy check is always the teacher. That's not a limitation
— it's the design. Teachers are education's accuracy layer; TLC
provides the scaffolding *and* the receipts.

---

## Architecture

TLC is a single Next.js 16 application running TypeScript end-to-end,
backed by Postgres (Neon) and a fine-tuned **Gemma 4 E4B** served from
a local llama.cpp instance. Google AI Studio's stock `gemma-4-31b-it`
(dense) is retained as a cloud fallback.

### Stack summary

| Layer | Choice |
|---|---|
| Language | TypeScript (frontend + API routes) |
| Framework | Next.js 16, App Router |
| UI | Tailwind v4 |
| Hosting | Vercel (frontend + API) |
| Database | Neon Postgres + Prisma ORM |
| AI (primary) | **Gemma 4 E4B + per-persona QLoRA adapters** (Hunter / Christine), served by llama.cpp on an Intel Arc B570; reached from Vercel via a Cloudflare Tunnel |
| AI (fallback) | Google AI Studio `gemma-4-31b-it` (dense) — used if the local backend is unreachable |
| Worker | Long-running Node process polls Neon for `pending` runs, orchestrates against the local model (`WORKER_MODE=1` on Vercel) — no Vercel function ceiling, no Cloudflare proxy timeout in the request path |
| Streaming | Server-Sent Events (Node runtime) |
| Source parsing | UTF-8 text + Markdown (PDF support deferred — pdf-parse's native bindings interact poorly with Vercel's runtimes; UI prompts the teacher to paste excerpts instead) |
| External verification | Wikipedia REST summary API + Wikidata `wbsearchentities` (no API keys; concurrency-capped at 6 in flight) |
| Observability | Vercel logs + BetterStack uptime monitor |

### Why this stack

- **One language** means the repo is inspectable top-to-bottom in a
  single mental model — useful for judges scanning the code
- **Vercel + local backend split** means the public site stays on a
  zero-ops serverless stack while the heavy inference runs on hardware
  TLC operators can actually pick (edge GPU, school server, laptop —
  whatever fits the deployment). No model API budget, no quota
  ceilings, no student data sent to a third party.
- **Open-weights model with persona LoRAs** means the response payload
  is fully attributable: the request hits a specific model file +
  adapter id, both versioned. Judge mode (`?judge=1`) shows the active
  adapter and timings for every call.
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

Full architecture documentation: [ARCHITECTURE.md in the repo](https://github.com/hardcoded74/tlc/blob/main/ARCHITECTURE.md)

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

Full schema: [SCHEMA.md in the repo](https://github.com/hardcoded74/tlc/blob/main/SCHEMA.md)

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
higher throughput can contact sam@tgcfl.com for a whitelist.

---

## What You See When You Open the Demo

1. **Landing page** — the pitch, the three-card intro to Hunter /
   Christine / Gemma 4, a "Create a Lesson" CTA
2. **Create flow** — a single-screen form (topic, grade, optional
   source upload, optional advanced settings)
3. **Collaboration panel** — when you submit, the screen splits into
   two panels showing Hunter and Christine contributing in real time.
   Each assistant's card streams bullet items as Gemma 4 emits them.
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
  cloud Gemma 4 integration (used both as the early backend and later
  as the teacher model for synthetic training data), three-phase
  orchestration running end-to-end as JSON
- Week 2 — Core flow: teacher input form, live-streaming assistant panel,
  review report UI, tabbed lesson package viewer, source upload pipeline,
  download endpoints (`.md` / `.html` / `.json`), per-IP rate limits
- Week 3 — Polish + verification: landing page, gallery with 6
  pre-generated lessons, public status page, judge mode inspector with
  contribution breakdown, regenerate-on-must-fix loop,
  accommodations for students with disabilities, **source verification
  against Wikipedia + Wikidata, NGSS / Common Core code validation,
  verification-aware regenerate**
- Week 4 — Local-first migration: SFT-trained Hunter and Christine
  QLoRA adapters on top of Gemma 4 E4B (~250 schema-validated examples
  per persona), GGUF quantization, llama.cpp serving with adapter
  hot-swap per request, Cloudflare Tunnel + worker split so Vercel
  can keep the public site simple while inference runs on hardware
  the operator owns. Demo video, screenshots, this writeup.

Full timeline breakdown: [BUILD_PLAN.md](https://github.com/hardcoded74/tlc/blob/main/BUILD_PLAN.md)

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
- **Standards auto-suggestion** — beyond the format validation we
  already do on cited codes, suggest matching NGSS / Common Core codes
  for lessons that don't cite any
- **Additional verification sources** — NASA / NOAA / USGS for science
  topics; PBS LearningMedia and OER Commons for vetted lesson context
- **Slide deck generation** — emit a Google Slides-compatible output
  alongside the lesson
- **Assessment feedback loop** — if a teacher marks a question
  "students didn't understand this," TLC regenerates just that item

---

## Why Gemma 4 E4B + LoRAs is the primary deploy

TLC's primary inference path is a **fine-tuned Gemma 4 E4B** running
in llama.cpp on a single edge GPU (an Intel Arc B570 in our
demonstration setup; any 8 GB+ Vulkan-capable GPU works). Cloud
inference would have been easier to ship, but it adds three drag
factors:

- network latency on every call,
- a quota ceiling that bites under load,
- and a privacy story that ends with "we send the teacher's input to
  Google."

The training pipeline in [`training/`](training/) is the answer to
all three. We use cloud Gemma 4 31B as a *teacher model*, generate
~250 schema-validated golden outputs per persona on a curated K-12
topic × grade matrix, and SFT-train a QLoRA adapter on top of stock
**Gemma 4 E4B** for each of Hunter and Christine. The 4B-parameter
edge model can't reliably emit our `PersonaScaffoldSchema` from
zero-shot; with ~250 examples it learns the strict-schema discipline
end-to-end.

The result: TLC deploys with no API budget, no quotas, and no
student data leaving the building. A single laptop-class GPU runs
the whole inference stack — a school IT department's dream. Stock
cloud Gemma 4 31B stays available as a faster fallback for
installations that want it.

This is the open-source pattern the Gemma 4 Good Hackathon's Impact
Track explicitly wants to encourage: small open-weights models,
fine-tuned on synthetic high-quality outputs from larger teachers,
deployed where users actually are. Both adapters are MIT-licensed and
published as Hugging Face model repos:

- [`hardcoded74/tlc-gemma-4-e4b-hunter-lora`](https://huggingface.co/hardcoded74/tlc-gemma-4-e4b-hunter-lora)
- [`hardcoded74/tlc-gemma-4-e4b-christine-lora`](https://huggingface.co/hardcoded74/tlc-gemma-4-e4b-christine-lora)

The full training pipeline (topic matrix, data-gen script, Colab
T4 notebook, GGUF export) is reproducible from the
[`training/README.md`](training/README.md) — anyone can re-run it
with their own teacher model or topic mix.

### How Vercel reaches the local model

Vercel's `WORKER_MODE=1` environment flag makes `/api/lesson/create`
do nothing more than insert a `pending` row and return — it does not
run the orchestrator inline. A long-running Node worker on the host
serving the local model polls Neon for `pending` rows, claims one
atomically, and orchestrates the full Build → Review → Package flow
against `127.0.0.1:8091`. The Vercel-side request never holds open a
30-minute connection, and the model never has to be reachable from
the public internet — only from the worker.

A Cloudflare Tunnel terminates at the same llama.cpp port, so the
deployed Vercel functions *can* still reach the model for ad-hoc
calls (the verifier paths, judge-mode probes). The split keeps the
slow paths off Vercel's function ceiling and the fast paths on the
edge.

---

## Operating constraints we worked under

The hackathon build runs primary inference on a single edge GPU
(Intel Arc B570, ~10 GB VRAM) hosting Gemma 4 E4B + two LoRA
adapters via llama.cpp. The constraints that shape the orchestration
are VRAM and the model's context window, not a per-minute API
quota:

- **Phase 3 context is assistant-scoped.** Each Package call sees its
  own Phase 1 scaffold in full but only a title + objective +
  handoff-notes summary of the partner's. The partner's full content
  isn't re-sent because the assistant never revises partner fields.
- **The regenerate-on-must-fix loop is bounded to one extra Build
  pass.** A second regenerate would be useful when the verifier finds
  a contradiction in a multi-part definition; we cap it because it
  could otherwise run away on input tokens.
- **System prompts are written for tool-calling, not chain-of-thought.**
  No "think step by step" preambles, no scratchpad — just the role
  and the schema.

On larger hardware (or a cloud Gemma 4 deployment with higher
quotas), TLC could **trade tokens for accuracy** in several ways:

1. **Allow longer thinking on Phase 2 Review** — let the reviewer
   produce a chain-of-thought before emitting the structured tool
   call, with the thinking discarded but the final issues sharper.
2. **Multi-pass review** — run a second review over the regenerated
   scaffold so a fix that introduces a new issue gets caught.
3. **Unbounded regenerate** — keep regenerating until the verifier
   reports zero contradictions, instead of capping at one retry.
4. **Re-include the partner scaffold in Phase 3** — restore the full
   cross-context for tighter coordination on overlapping fields.

These are levers that show up the moment the per-minute budget stops
binding. For the hackathon submission we made the tradeoff toward
*reliable runs inside quota* rather than maximum quality per run.

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
- **Fast inference** — per-persona LoRAs on Gemma 4 E4B sustain
  ~28-30 tokens/second on a single edge GPU; an end-to-end lesson
  (5-7 calls) lands in 10-13 minutes wall-clock, well inside what
  "while I make coffee" can absorb
- **Open model family** — the open weights let us reason about the
  model's behavior and debug prompts against local copies during
  development

TLC is a demonstration of Gemma 4 as a *conductor* of a specialist
workflow rather than a single generalist AI. That framing makes the
product stronger: two Teacher's Assistants, three phases, source grounding,
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

- **Built by:** Sam · sam@tgcfl.com
- **Model:** Gemma 4 E4B (it), fine-tuned per-persona via QLoRA (Hunter
  + Christine adapters) and served locally with llama.cpp. Stock
  Gemma 4 31B (dense) via Google AI Studio retained as cloud fallback.
- **Personas:** Hunter (structure & rigor), Christine (depth &
  engagement)
- **External verification:** Wikipedia REST summary API · Wikidata
  `wbsearchentities` (CC BY-SA + CC0 respectively)
- **Framework:** Next.js 16, Tailwind v4, Prisma
- **Hosting:** Vercel (frontend + API), Neon (database), local
  llama.cpp on Intel Arc B570 (model) — reached from Vercel via a
  Cloudflare Tunnel

**License:** MIT. Open source. Fork it, build on it, improve it.

**Repo:** [github.com/hardcoded74/tlc](https://github.com/hardcoded74/tlc)

**Demo video:** to be added when published.

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
- **[Source code](https://github.com/hardcoded74/tlc)** — MIT, read
  top-to-bottom
- **[Architecture doc](https://github.com/hardcoded74/tlc/blob/main/ARCHITECTURE.md)** — technical deep dive
- **[Schema doc](https://github.com/hardcoded74/tlc/blob/main/SCHEMA.md)** —
  structured output contract
- **[Persona design](https://github.com/hardcoded74/tlc/blob/main/PROMPTS.md)** — Hunter + Christine system prompts
- **Demo video** — to be added when published (2:30 walkthrough)

---

*TLC. Every Teacher Deserves TLC.*
