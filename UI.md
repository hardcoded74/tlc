# TLC — UI / UX Layout

Component specs and wireframes for the teacher-facing interface. Opinionated
choices, dimensioned details, interaction states called out explicitly.

The guiding principle: **teachers should feel like they're working with
competent colleagues, not operating a machine.** Hunter and Christine have
to be visible as collaborators, not hidden behind a progress bar.

---

## 1. Design Principles

### 1.1 Trust reads as specificity
"A 10-minute partner activity where pairs trace the water cycle on
laminated diagrams" looks credible. "Engage students with a hands-on
activity" looks like filler. The UI amplifies this: concrete details
get typographic emphasis; vague placeholders should be visibly absent.

### 1.2 The collaboration is visible
The two-persona story only works if a judge (or a teacher) can watch
both personas contribute **simultaneously**. This means side-by-side
streaming panels, not a single progress indicator.

### 1.3 Source grounding is inline, not a separate page
Every section of a lesson shows a small pill with its `source_origin`.
Teachers never have to click into a separate "source report" to see
what came from where.

### 1.4 Warm, not childish
Teachers aren't a kids' audience. The palette reads as professional
(muted greens/blues, cream background, high-contrast text), the
typography is serif-led for body (Georgia/Lora) so output feels
print-ready. Avatars are illustrated but not cartoonish.

### 1.5 The download button is always reachable
From the moment a lesson is complete, downloading it should be one click
from any angle — the viewer page, the share link, the gallery, the
create flow's success state. The entire product is pointed at "walk
away with a usable lesson."

---

## 2. Design Tokens

### 2.1 Color Palette

```
Primary (sage)       #7A9A7A  — CTAs, active states
Primary dark         #4A6B4A  — hover, pressed
Accent (warm sand)   #D4B896  — Christine's persona color
Accent 2 (slate)     #5C7A96  — Hunter's persona color
Background           #FAF8F3  — cream, easy on eyes
Surface              #FFFFFF  — cards, modals
Surface muted        #F0EDE5
Border               #E5DFD2
Text primary         #1C1C1C
Text secondary       #5C5C5C
Text muted           #8A8A8A
Success              #3F7D3F
Warning              #C28A3B
Error                #A33F3F
```

Hunter and Christine have their own accent colors throughout — slate for
Hunter (structure, cool), warm sand for Christine (depth, warmth). These
persist across every UI touchpoint so users associate the color with the
persona.

### 2.2 Typography

```
Font (UI)            Inter, system-ui fallback
Font (body/lesson)   Georgia, 'Times New Roman', serif
Font (mono)          'JetBrains Mono', ui-monospace

Scale:
  display     36px / 1.15 / -0.5%   — hero lines
  heading-1   28px / 1.25 / -0.3%   — page titles
  heading-2   22px / 1.3 / -0.2%    — section titles
  heading-3   18px / 1.4 / -0.1%    — subsections
  body        16px / 1.6 / 0        — default
  body-sm     14px / 1.55 / 0       — secondary
  caption     12px / 1.5 / +0.1%    — metadata, pills
```

The serif body is deliberate: lesson output should look like something
teachers would hand to students, not like a web app. Landing pages and
navigation stay Inter.

### 2.3 Spacing

4px base unit. Common values: 4, 8, 12, 16, 24, 32, 48, 64.

### 2.4 Shadows

```
card        0 1px 3px rgba(28,28,28,0.04), 0 1px 2px rgba(28,28,28,0.06)
elevated    0 4px 8px rgba(28,28,28,0.06), 0 2px 4px rgba(28,28,28,0.08)
modal       0 16px 32px rgba(28,28,28,0.12), 0 4px 8px rgba(28,28,28,0.08)
```

Restraint matters. Big dramatic shadows read as "startup trying to
impress"; small honest shadows read as "product that's been through a
design pass."

---

## 3. Screen Map

```
/                       landing
/create                 main flow (teacher input → live generation → result)
/lesson/[id]            shareable read-only viewer
/gallery                pre-generated example lessons
/about                  Gemma 4 + persona + privacy story
/status                 uptime + stats (public observability)
```

Judge mode: `?judge=1` on `/create` or `/lesson/[id]` adds the inspector
panel, bypasses rate limits, shows internal state.

---

## 4. Landing (`/`)

### 4.1 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│       Every Teacher Deserves TLC.                               │
│                                                                 │
│       Turn a topic and grade level into a complete              │
│       classroom-ready lesson package — with Hunter and          │
│       Christine, two Gemma 4-powered collaborators who          │
│       actually finish the job.                                  │
│                                                                 │
│                   [  Create a Lesson  →  ]                     │
│                                                                 │
│       ── Example Gallery ── See 6 lessons built with TLC        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─── Hunter ────┐  ┌── Christine ──┐  ┌── Gemma 4 ────┐      │
│   │ Structure.    │  │ Depth.        │  │ The engine.   │      │
│   │ Rigor. Time   │  │ Engagement.   │  │ One model,    │      │
│   │ math. Clear   │  │ Classroom     │  │ two specialist │      │
│   │ assessments.  │  │ practicality. │  │ personas.      │      │
│   └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   What you get:                                                 │
│   • A lesson plan with timed sections                           │
│   • A materials list (actual supplies, not vague "resources")   │
│   • At least one real engagement moment                         │
│   • A demonstration when the topic supports one                 │
│   • Guided and independent practice                             │
│   • An assessment and answer key                                │
│   • Teacher notes on common misconceptions                      │
│   • Optional differentiation for struggling and advanced        │
│                                                                 │
│                   [  Create Your First Lesson  ]               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Built on Gemma 4 • MIT License • No tracking • Open repo       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Components

- `<Hero>` — the pitch block with CTA. Above the fold on desktop.
- `<PersonaIntro>` — three-column with Hunter / Christine / Gemma 4
  cards. Each card has the persona's accent color as a thin top border
  + a brief tagline.
- `<FeatureList>` — the "What you get" bullet list. Keep it concrete.
- `<Footer>` — source repo link, MIT notice, privacy link, status badge.

### 4.3 Mobile
- Stack the three persona cards vertically
- CTA buttons full-width
- Hero line drops to 28px

---

## 5. Create Flow (`/create`) — the money shot

Three states on one page: `input` → `generating` → `complete`.
Transitions are smooth (no full page reload).

### 5.1 State 1: Input

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Build a Lesson                                                │
│   ───────────────                                               │
│                                                                 │
│   What are you teaching?                                        │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ e.g., photosynthesis, fractions, the water cycle       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Grade level                  Class length (optional)          │
│   ┌─────────────────┐          ┌───────────┐                   │
│   │ 5th grade     ▾│          │ 45 min  ▾│                   │
│   └─────────────────┘          └───────────┘                   │
│                                                                 │
│   Subject (optional)           Learning objective (optional)    │
│   ┌─────────────────┐          ┌─────────────────────────────┐  │
│   │ Science        ▾│          │ e.g., identify the inputs  │  │
│   └─────────────────┘          │  and outputs of...          │  │
│                                 └─────────────────────────────┘  │
│                                                                 │
│   ▸ Add source material (standards, textbook excerpt, notes)   │
│     [expanded on click, see below]                              │
│                                                                 │
│   ▸ Advanced options (differentiation, homework, enrichment)   │
│     [checkboxes, expand on click]                              │
│                                                                 │
│                         [  Start Building  →  ]                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Built on Gemma 4 • MIT License • No tracking • Open repo       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Source material expanded

```
   ▾ Source material (optional, but improves accuracy)

     Paste text, or upload a file. Your material is used for this
     lesson and deleted within 1 hour.

     ┌─────────────────────────────────────────────────────────┐
     │  Paste curriculum excerpts, standards language, or      │
     │  teaching notes here...                                  │
     │                                                          │
     │                                                          │
     └─────────────────────────────────────────────────────────┘

           —  or  —

     ┌─────────────────┐
     │ 📎 Upload a file│   .txt  .md  .pdf  up to 2 MB
     └─────────────────┘
```

After upload, a preview:
```
     ✓ curriculum_excerpt.pdf • 3 pages • 4,200 characters extracted
       [first 200 chars shown here as a quick sanity check]
       Will be deleted at 11:42 PM.  [ Remove file ]
```

### 5.3 State 2: Generating — the live collaboration panel

This is the screen judges will watch. It earns the product.

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Building a lesson: Photosynthesis, 5th grade                  │
│                                                                 │
│   ◯─────●─────◯          Phase 2 of 3: Reviewing                │
│   Build   Review   Package                                      │
│                                                                 │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   ┌──────────────────┐     │  ┌──────────────────┐              │
│   │  🎯              │     │  │  🌱              │              │
│   │  Hunter          │     │  │  Christine       │              │
│   │  Structure &     │     │  │  Depth &         │              │
│   │  rigor           │     │  │  engagement      │              │
│   └──────────────────┘     │  └──────────────────┘              │
│                            │                                    │
│   ✓ Objective locked       │  ✓ Hook: "if farmers water...     │
│   ✓ 6 steps, 45 min total  │  ✓ Demo: plastic bag on leaf      │
│   ✓ Assessment: 3-question │  ✓ Teacher note: slow down at    │
│     exit ticket            │    'plants make their own food'   │
│   ✓ Time math checks out   │  ✓ 3 misconceptions flagged       │
│                            │  ⠼ Building differentiation...    │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│                                                                 │
│   📋 Review report                                              │
│   ──────────────────                                            │
│   ✓ Grade fit: appropriate                                      │
│   ✓ Source alignment: N/A (no source provided)                  │
│   ⚠ Should-fix (2):                                             │
│      • Hunter and Christine wrote different titles — merging    │
│      • Engagement: use Christine's discussion prompt            │
│   Ready for packaging ✓                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Taking longer than usual? View the gallery for examples →     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 State 3: Complete

Transitions from State 2 by collapsing the persona panels into a slim
summary bar and revealing the full lesson package below.

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Photosynthesis: How Plants Make Their Own Food (And Ours)     │
│   5th grade • Science • 45 min                                  │
│                                                                 │
│   Share: tlc-demo.vercel.app/lesson/a7f3...  [ Copy link ]      │
│                                                                 │
│   [ ↓ Download .md ]  [ ↓ Download .html ]  [ ↓ Download .json ] │
│                                                                 │
│   ▸ Hunter and Christine collaborated on this lesson (expand)   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [ Plan ] [ Materials ] [ Activities ] [ Assessment ] [ Notes ]│
│                                                                 │
│   ────────────────────────────────────────────────────────────  │
│                                                                 │
│   Learning Objective                      ● scaffolded           │
│   Students will identify the three inputs of photosynthesis     │
│   (sunlight, water, carbon dioxide) and the two outputs         │
│   (glucose, oxygen), and explain why plants matter for the      │
│   air we breathe.                                               │
│                                                                 │
│   Overview                                                      │
│   Students learn that plants make their own food through        │
│   photosynthesis...                                             │
│                                                                 │
│   Lesson Steps                            ▾                     │
│                                                                 │
│     [1]  5 min  Warm-up observation                 ● generated │
│          Teacher: "If I forgot to water this for a month..."    │
│          Student: Respond verbally, explain why each would kill │
│                                                                 │
│     [2] 10 min  Introduce photosynthesis            ● scaffolded│
│          Teacher: Write equation in plain language...           │
│                                                                 │
│     ...                                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Built on Gemma 4 • MIT License • No tracking • Open repo       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Components

- `<TeacherInputForm>` — renders State 1. Validates with Zod on submit.
- `<PhaseIndicator>` — the three-node progress bar (Build / Review / Package)
- `<PersonaPanel>` — two `<PersonaCard>` side-by-side
- `<PersonaCard>` — avatar, name, role, streaming body with bullet list
  as items appear
- `<StreamingBody>` — subscribes to SSE, appends bullet items as
  `hunter_complete` / `christine_complete` events arrive. During active
  generation shows "⠼ Building X..." with the field name
- `<ReviewReport>` — expandable, shows grade fit / source alignment /
  issue counts / list of issues with severity icons
- `<LessonPackage>` — the final output with `<SectionTabs>`
- `<SectionTabs>` — Plan / Materials / Activities / Assessment / Notes.
  Active tab has the Hunter or Christine accent color depending on
  which persona owns it
- `<SourceNote>` — the inline pill: `● grounded` (green), `● scaffolded`
  (neutral), `● generated` (warm sand, visually distinct so teachers
  know to verify)
- `<DownloadButtons>` — three buttons in a row, pill style
- `<CollaborationAttribution>` — the expandable "Hunter and Christine
  collaborated" block that shows who wrote what

---

## 6. Lesson Viewer (`/lesson/[id]`)

A cleaner, slightly more print-friendly version of State 3. No persona
panels, no streaming, no phase indicator. Just the lesson.

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ← Back to gallery                                             │
│                                                                 │
│   Photosynthesis: How Plants Make Their Own Food (And Ours)     │
│   5th grade • Science • 45 min • Created 2026-05-10             │
│                                                                 │
│   [ ↓ Download .md ]  [ ↓ Download .html ]  [ ↓ .json ]         │
│                                                                 │
│   ────────────────────────────────────────────────────────────  │
│                                                                 │
│   [ Plan ] [ Materials ] [ Activities ] [ Assessment ] [ Notes ]│
│                                                                 │
│   ...same tabbed content as State 3...                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 Print Styles
When the teacher prints this page (or downloads `.html` and prints):
- Tab switcher hides
- All sections expand inline
- Page breaks between Plan / Activities / Assessment
- No header navigation
- Monochrome with simple section rules

---

## 7. Gallery (`/gallery`)

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC                                    About   Gallery    Try  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Example Lessons                                               │
│   ────────────────                                              │
│   Pre-built with TLC to show what the system produces.          │
│                                                                 │
│   ┌────────────────────┐  ┌────────────────────┐                │
│   │ Photosynthesis     │  │ Fractions          │                │
│   │ 5th grade • 45 min │  │ 3rd grade • 30 min │                │
│   │ Science            │  │ Math               │                │
│   │                    │  │                    │                │
│   │ Students learn how │  │ Introduce halves   │                │
│   │ plants make food…  │  │ and quarters…      │                │
│   │                    │  │                    │                │
│   │    [ Open →  ]     │  │    [ Open →  ]     │                │
│   └────────────────────┘  └────────────────────┘                │
│                                                                 │
│   ┌────────────────────┐  ┌────────────────────┐                │
│   │ Water cycle        │  │ Civil rights intro │                │
│   │ 4th grade • 45 min │  │ Middle school • 50 │                │
│   │ Science            │  │ Social Studies     │                │
│   │                    │  │                    │                │
│   │    [ Open →  ]     │  │    [ Open →  ]     │                │
│   └────────────────────┘  └────────────────────┘                │
│                                                                 │
│   ... 2 more ...                                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Built on Gemma 4 • MIT License • No tracking • Open repo       │
└─────────────────────────────────────────────────────────────────┘
```

6 pre-generated lessons (seed script populates the DB). Each card is a
mini-preview with topic, grade, subject, first sentence of overview.
Click → `/lesson/[id]`.

### 7.1 Why the Gallery Matters
If Gemma 4 goes down mid-judging, the gallery is always available. Each
lesson there is real TLC output stored in the DB. Judges can still
experience the product quality.

---

## 8. About (`/about`)

Single-page scroll: What is TLC → Why Gemma 4 → Hunter + Christine → How
accuracy works → Privacy → Built by (credits) → Open source.

```
About TLC
─────────

TLC: Teacher's Lesson Creator is a Gemma 4-powered tool that turns a
topic and grade level into a complete, classroom-ready lesson package.

[Why Gemma 4]

Gemma 4's strengths match what lesson building needs — multi-step
reasoning, tool-calling for structured output, coherent long-form
generation, and fast-enough inference for interactive demos. TLC uses
Gemma 4 not as "an AI that writes lessons," but as a *conductor* of a
specialist workflow.

[Hunter and Christine]

Two personas. Two Gemma 4 calls per phase. Two different jobs.

Hunter (slate) focuses on structure and rigor. Christine (warm sand)
focuses on depth and engagement. Each emits structured tool-call output;
the system merges them with explicit rules (Hunter owns structural
fields; Christine owns pedagogical fields).

[Accuracy Posture]

TLC is source-guided, not source-guaranteed. When you provide teaching
material, the system prefers it. Every section in the output carries a
label:
   ● grounded     — content traces directly to your source
   ● scaffolded   — your source shaped the structure; wording is ours
   ● generated    — open generation; no source ties (review this)

The final lesson is designed for teacher review before classroom use.
Teachers are the last accuracy check — always.

[Privacy]

TLC doesn't track you. We don't store IP addresses (only a daily-rotated
hash for rate limiting). Uploaded source material is kept for 1 hour
then deleted. Generated lessons are retained for 30 days with an
unguessable URL; after that they're pruned.

[Built by]

[Sam's bio here]

[Open source]

TLC is MIT-licensed. The full source code is at [github.com/...].
```

---

## 9. Status (`/status`)

A real, public-facing status page. This reads as professionalism to
judges evaluating whether TLC is a serious product.

```
┌─────────────────────────────────────────────────────────────────┐
│  System Status                                                  │
│  ─────────────                                                  │
│                                                                 │
│   All systems operational   ● green                             │
│   Uptime (last 24h): 99.8%                                      │
│   Last checked: 30 seconds ago                                  │
│                                                                 │
│   ● Gemma 4 E4B (local llama.cpp)     OK   • 0.4s avg          │
│   ● Database (Neon Postgres)          OK   • 45ms avg          │
│   ● Frontend (Vercel)                 OK                        │
│                                                                 │
│   ─────                                                         │
│                                                                 │
│   Usage today                                                   │
│   • Lessons created: 47                                         │
│   • Tokens in/out:   142K / 89K                                 │
│   • Avg latency:     58 sec end-to-end                          │
│   • Error rate:      0.3%                                       │
│                                                                 │
│   ─────                                                         │
│                                                                 │
│   Recent incidents  None this week.                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Judge Mode (`?judge=1`)

An extra panel that appears at the bottom of `/create` and `/lesson/[id]`
when the query param is present.

```
┌─────────────────────────────────────────────────────────────────┐
│  Inspector                                                      │
│  ─────────                                                      │
│                                                                 │
│  Phase timings:                                                 │
│    Build:       24.3s   (Hunter: 11.8s, Christine: 23.1s)      │
│    Review:       8.7s                                           │
│    Package:     19.4s   (Hunter: 9.2s, Christine: 18.6s)       │
│    Total:       52.4s                                           │
│                                                                 │
│  Token usage:                                                   │
│    Build:        8,124 in / 4,612 out                           │
│    Review:       6,890 in / 1,234 out                           │
│    Package:     12,340 in / 6,887 out                           │
│    Total:       27,354 in / 12,733 out                          │
│                                                                 │
│  [ ▸ Raw tool calls JSON ]                                      │
│  [ ▸ Merge log (which persona's field won where) ]              │
│  [ ▸ Source-grounding trace ]                                   │
│                                                                 │
│  Gemma API request IDs (for audit):                             │
│    build-hunter:     req_a7f3...                                │
│    build-christine:  req_b821...                                │
│    review:           req_c9d2...                                │
│    package-hunter:   req_d3e4...                                │
│    package-christine: req_e5f6...                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Judges appreciate being able to see internals. This panel is also a
quiet credibility signal — "we're confident enough to show you our work."

---

## 11. Critical UX Moments

### 11.1 Streaming delay
Between hitting "Start Building" and the first token appearing, there's
a 3-5s quiet. The persona panels need to fill that quiet with:
- Immediate phase indicator change to "Phase 1 of 3: Building"
- "⠼ Contacting Gemma 4..." on both persona cards
- Subtle skeleton animation on the card body

Dead time without feedback is where product trust dies.

### 11.2 Validation failure → retry
If Gemma's tool call fails Zod validation, the user sees:
- Phase indicator subtly pulses
- A small toast: "Refining output..."
- 2-3 seconds later, normal streaming resumes
- If retry ALSO fails: a friendly error with a "Try again" button and a
  link to the gallery

### 11.3 Source upload failure
PDF parsing is unreliable. If parse extracts <100 chars or fails:
- Upload preview shows: "⚠ Couldn't extract clean text from this PDF.
  Try pasting the content directly in the text area instead."
- The upload widget collapses; the text area expands and focuses

### 11.4 Rate limit hit
Banner above the input form:
- "You've created 10 lessons in the last hour. Rate limit resets at
  3:42 PM. Want to browse examples while you wait? [Gallery →]"

### 11.5 Completion moment
When the final package appears, there's a single visual beat:
- Persona panels collapse into the thin summary bar (0.3s ease)
- Lesson title fades in at full display size
- Download buttons appear with a subtle bounce
- Section tabs are pre-selected to "Plan"

This is the moment the user decides whether TLC delivered. Make it feel
like arrival, not like a spinner finally stopped.

---

## 12. Responsive Behavior

### 12.1 Desktop (≥1024px)
- Max content width: 1024px, centered
- Persona panels side by side on `/create` generating state
- Gallery is 2-3 columns

### 12.2 Tablet (768-1023px)
- Content width: 768px
- Persona panels still side by side but narrower
- Gallery is 2 columns

### 12.3 Mobile (<768px)
- Content width: 100% with 16px side padding
- Persona panels stack vertically
- Gallery is 1 column
- Section tabs scroll horizontally with subtle fade indicators on
  overflow
- Download buttons stack full-width

### 12.4 Critical mobile touchpoints
- Text input: don't auto-zoom iOS (set `font-size: 16px` explicitly)
- File upload: make sure the upload button isn't obscured by mobile
  keyboards when focus is in the paste area
- Long lesson bodies: make sure the serif body is readable at mobile
  zoom levels (min 16px)

---

## 13. Accessibility

- All interactive elements have visible focus rings (sage-colored)
- Contrast ratios: body text 14:1, secondary 7:1, all exceed WCAG AA
- Source_origin pills have an icon + color, not just color alone
  (colorblind-safe)
- Phase indicator announces state changes via `aria-live`
- Streaming content appends via `aria-live="polite"` so screen readers
  narrate arrivals without interrupting
- Keyboard navigation works end-to-end; no mouse-only interactions
- Hunter and Christine avatars have alt text ("Hunter, structure and
  rigor persona") — not decorative
- Mobile touch targets ≥ 44px square

---

## 14. Component Library Plan (shadcn/ui)

Components to generate via `npx shadcn@latest add`:

```
button card dialog dropdown-menu form input label
progress select separator tabs textarea toast
```

Custom components (built locally):
- `PersonaCard` — not in shadcn's library; built on their `Card`
- `StreamingBody` — custom SSE consumer
- `SectionTabs` — wraps shadcn's `Tabs` with persona-color accents
- `SourceNote` — custom pill with icon + color
- `PhaseIndicator` — custom three-node progress (shadcn's `Progress` is
  linear; this is stepped)

---

## 15. Summary

The UI's job is to make the two-persona story legible. Every screen
makes some contribution to that goal:

- Landing — tells judges and teachers what the personas are
- Create (generating) — lets them watch the collaboration happen
- Lesson viewer — renders the merged output with visible provenance
- Gallery — shows real examples when live generation isn't available
- About — explains accuracy posture and privacy honestly
- Status — proves the system is real
- Judge mode — offers internal state for the judges who want it

**Nothing here is decorative. Every component earns its place by either
producing the lesson or making the process legible.**
