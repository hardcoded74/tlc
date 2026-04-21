# TLC: Teacher's Lesson Creator

**Tagline:** *Every Teacher Deserves TLC.*

**One-line description:** A Gemma 4-powered lesson-building tool that turns
a topic and grade level into a complete, classroom-ready teaching kit —
guided by two collaborating personas, Hunter and Christine.

**Contest:** Gemma 4 Good Hackathon — Impact Track (education)
**Submission deadline:** 2026-05-18

---

## 1. What TLC Does

A teacher enters two things: **a topic** and **a grade level**. Optionally, they
paste curriculum notes, standards, or upload a reference document.

Forty-five seconds later, they have a complete lesson package:

- Lesson title, objective, and overview
- Estimated class length with timed sections
- Materials list (actual supplies, not abstract "resources")
- Step-by-step teacher-facing lesson plan
- At least one engagement opportunity (warm-up, discussion, partner activity)
- A demonstration or hands-on element when appropriate
- Guided practice + independent practice
- An assessment (quiz, exit ticket, or comprehension check)
- Teacher guidance / answer key
- Optional: differentiation, enrichment, homework

The teacher reviews, edits anything that needs editing, and walks into
class tomorrow with something they can actually teach.

## 2. Why TLC

**Most AI lesson tools stop at an outline.** Teachers still have to:
- Draft the activity details themselves
- Write the assessment
- Figure out the engagement moments
- Make the answer key
- Assemble everything into something they can hand out or teach from

**TLC goes the rest of the way.** The output is a *teaching kit*, not a draft.

**Teachers don't need another text generator. They need something that
finishes the job.**

## 3. Why Gemma 4 (Contest Positioning)

Gemma 4's strengths map directly onto what lesson building needs:
- **Multi-step instruction-following** (the three-phase Build → Review → Package flow)
- **Native tool-calling** (source ingestion, structured output)
- **Coherent long-form generation** (full lesson packages, not snippets)
- **Fast enough for interactive demos** (~10-20 sec per phase on reasonable hardware)

TLC is a demonstration of Gemma 4 as a *conductor* — orchestrating two
persona-driven passes, grounding output in source material, and producing
structured, usable artifacts. This is more interesting than "Gemma 4
wrote a lesson plan" — it's Gemma 4 composing a specialist workflow.

## 4. Hunter and Christine

**Two personas, two Gemma 4 calls per phase, two visible contributions.**

### Hunter — Structure and Rigor

Hunter is the system's architect. Hunter asks:
- Does this make sense?
- Is the flow solid?
- Does the lesson build from prior knowledge to new mastery?
- Is the assessment tied to the objective?
- Is the grade level appropriate?
- Are standards addressed if provided?

Hunter shapes **sequence, structure, and instructional integrity**. When
something is fuzzy or out of order, Hunter flags it. When the assessment
doesn't actually test the objective, Hunter rewrites it. Hunter's voice is
direct, clear, and rigorous.

### Christine — Depth and Engagement

Christine is the system's pedagogue. Christine asks:
- Will this land in a real classroom?
- Where's the engagement moment?
- Is there a demonstration or example that makes this concrete?
- Does the teacher have everything they need to deliver this?
- Is there a discussion opportunity that would pull students in?

Christine shapes **depth, usability, and classroom practicality**. When a
step is thin, Christine thickens it with an example. When a lesson feels
dry, Christine adds a hands-on moment or a discussion prompt. Christine's
voice is warm, practical, and teacher-aware.

### Why Two Voices

Judges will see both personas **contribute visibly** to the final lesson.
This isn't cosmetic — it's the architecture: two Gemma 4 calls with
distinct system prompts, each producing a labeled contribution the
teacher (and judge) can inspect. The two-persona story is what
differentiates TLC from "AI generated a lesson."

## 5. The Three-Phase Workflow

### Phase 1: Build

Teacher submits inputs. Gemma 4 (as Hunter + Christine, two calls)
produces an initial **scaffold**:
- Title, objective, grade level, estimated time
- Overview
- Materials
- Lesson steps (sequence)
- Activities (at least one engagement + one practice)
- Assessment draft

**Time budget:** ~15 seconds per persona call, parallel when possible.

### Phase 2: Review

Gemma 4 (one call, with the full scaffold + original inputs) performs a
structured review:
- Grade-level fit — is language and complexity age-appropriate?
- Structure — does the lesson build correctly?
- Source alignment — if teacher provided materials, are they used?
- Internal consistency — do activities support the objective?
- Engagement — is there at least one real classroom moment?
- Demonstration — is one needed and, if so, is it realistic?
- Assessment alignment — does the assessment test the objective?
- Gaps — anything missing that a real teacher would need?

Output: a **review report** with flagged issues + proposed fixes. The
teacher can see exactly what TLC checked and changed.

### Phase 3: Package

Gemma 4 (two calls, Hunter + Christine again) finalizes the package
using review findings:
- Finalized lesson plan with timed blocks
- Complete materials list
- Expanded engagement + demonstration sections
- Guided practice + independent practice
- Assessment with answer key
- Teacher guidance notes
- Optional: differentiation, enrichment, homework

**Time budget:** ~30 seconds.

**Total end-to-end:** ~60-90 seconds for a complete lesson package.

## 6. Source-Grounded Generation

**This is the accuracy anchor.** TLC supports two source types:

### Teacher-Provided Sources
- Pasted text (curriculum excerpt, standards language, notes)
- Uploaded file (`.txt`, `.md`, `.pdf` in MVP)

### Trusted Platform Sources *(stretch)*
- A small curated library of grade-level references (e.g., NGSS standards,
  Common Core samples) that TLC can reach into when no teacher source is
  provided.

### How Grounding Works

When a teacher provides source material:
1. The source is included in the Gemma 4 system prompt (or retrieved via
   embedding search if large)
2. Hunter and Christine are instructed to **prefer source material** over
   open-ended generation for factual content
3. Generated content is **labeled**: `source-grounded` (directly drawn
   from provided material), `scaffolded` (pedagogical structure around
   source content), or `generated` (open generation — flagged for teacher
   review)
4. The final output includes a **source notes** section showing which
   claims came from where

### Honest Framing (Not Overpromised)

TLC is:
- **Source-guided** — prefers teacher material when provided
- **Source-grounded** — labels content by origin
- **Designed to reduce inaccuracies** — but not "guaranteed accurate"
- **Teacher-reviewed before classroom use** — the final human check is
  always the teacher

## 7. MVP Scope (Must Do)

1. Accept lesson topic + grade level as required inputs
2. Accept optional class length, subject, learning objective, notes
3. Accept pasted text source OR uploaded `.txt/.md/.pdf` (single file)
4. Run Phase 1 (Build) with visible Hunter + Christine contributions
5. Run Phase 2 (Review) with a visible review report
6. Run Phase 3 (Package) producing a complete lesson package
7. Render the lesson package in a clean, teacher-facing layout
8. Let the teacher download the lesson as markdown or HTML
9. Ship a **public live demo** (hosted, no login required)
10. Ship a **public code repo** (MIT license, documented)
11. Ship a **demo video** (2-3 min walkthrough)
12. Ship a **Kaggle writeup** with the above attached

## 8. Out of Scope (MVP)

- Teacher accounts / login
- Lesson history / save
- LMS integrations (Google Classroom, Canvas, etc.)
- Collaboration between multiple teachers
- Real-time co-editing
- Print-layout design (CSS for paper output)
- Multiple assessment formats beyond one-per-lesson
- URL fetch as source
- Image / OCR source ingestion
- `.docx` upload
- Slide deck generation
- Standards alignment matching (automated cross-referencing)

Every one of these is a valid future feature. None of them are what wins
this hackathon.

## 9. Success Criteria for the Demo

When a judge watches the demo video, they should be able to answer yes to:

- [ ] Is the teacher's input obviously simple? (One topic, one grade)
- [ ] Can I see Hunter and Christine contributing, not just a single AI voice?
- [ ] Did the output include materials, an activity, and an assessment?
- [ ] Could a teacher actually walk into a classroom with this?
- [ ] Did I see Gemma 4 mentioned clearly in the flow?
- [ ] Was source material optionally used, and was its effect visible?
- [ ] Is the live demo working at the URL shown?
- [ ] Is the code repo open and inspectable?

If all yes, the submission is complete and credible.

## 10. The Judge-Facing Value Proposition

> Teachers are overloaded. Lesson prep takes time. Most AI tools generate
> text, but not something a teacher can actually walk into class and use.
>
> TLC turns a topic and grade level into a complete teaching kit. Gemma 4
> orchestrates two personas — Hunter for structure, Christine for depth —
> through a three-phase Build → Review → Package workflow, grounded in
> teacher-provided source material when available.
>
> Teachers go from idea to instruction faster. Every Teacher Deserves TLC.

## 11. Deliverables Checklist (Kaggle)

- [ ] Kaggle writeup (project description, architecture, demo link)
- [ ] Public code repo (GitHub, MIT license)
- [ ] Live demo URL (HF Space or similar)
- [ ] Demo video (2-3 min, narrated walkthrough)
- [ ] Media gallery (screenshots of the full flow + output samples)

## 12. Known Risks

1. **Gemma 4 structured output consistency** — getting reliable JSON out
   of a 4B model takes either function-calling or careful prompt +
   retry. Mitigation: use Gemma 4's native tool-calling for structured
   output, with a schema validator and a single retry on parse failure.
2. **Latency for two-persona calls** — 4-5 model calls per lesson
   (2 build + 1 review + 2 package) is 45-90 seconds end-to-end. This is
   fine for the demo narrative ("watch them collaborate") but need a
   good loading state. Mitigation: progressive streaming of each phase's
   output, so the teacher sees the scaffold immediately while review runs.
3. **Live demo hosting** — free-tier HF Spaces run Gemma 4 at CPU or
   shared-GPU speeds, which can be painfully slow. Mitigation: budget
   for a paid tier for demo week, or host the model separately on a
   dedicated endpoint and have the Space hit it.
4. **Source-material PDF parsing** — PDFs are notoriously uneven.
   Mitigation: use `pdf.js` or `pypdf` with an explicit fallback: "couldn't
   parse this PDF cleanly — paste the text instead."
5. **Teacher review vs. auto-ship** — the demo will look most impressive
   if TLC produces a finished lesson without teacher intervention.
   But overpromising "finished" invites criticism. Mitigation: lesson
   is clearly labeled "draft for teacher review" in the UI, and the
   demo video explicitly calls this out.
