# TLC — Demo Script

A 2:30 demo video script optimized for Kaggle judges. Three acts.
Specific on-screen actions, timestamps, narration. Two alternate opens
so the first 15 seconds can be A/B tested during recording.

---

## Design Principles

### What a Kaggle judge is looking for in the first 10 seconds
1. Is this actually a working product?
2. Is Gemma 4 genuinely central, not a marketing sticker?
3. Does this solve a real problem or is it a toy?

The video answers all three in the opening. Everything else is support.

### Pacing
- 2:30 total target (≤ 3:00 hard cap)
- 165–180 words per minute of narration
- Music bed: soft instrumental under narration, lifts during the
  completion moment
- No dead air; no filler

### Recording style
- Screen recording at 1080p or higher
- Cursor is visible but not distracting
- No splash text / kinetic typography — the product speaks
- One clean take per scene; cut between takes

### Honesty posture
- No speeding up footage to lie about latency ("fast-forward through
  60 seconds of Gemma working" is fine; editing to pretend it was 10
  seconds is not)
- The Gemma 4 logo / attribution shows in the AI Studio response panel
  in judge mode — let it be visible for at least 2 seconds

---

## Three-Act Structure

```
Act 1  (0:00–0:25)   THE PROBLEM   ~60 words
Act 2  (0:25–1:55)   THE PRODUCT   ~240 words
Act 3  (1:55–2:30)   THE CLOSE     ~85 words

Total: ~385 words of narration across 2:30
```

---

## Act 1 — The Problem (0:00–0:25)

### On-screen (no voiceover for first 3 seconds)
Open on a messy teacher desk: coffee mug, stacks of papers, a tablet
with a half-written lesson plan. Stock footage or a real desk shot. Five
seconds of ambient silence.

### Cut to the landing page

### Voiceover begins at 0:05

> Teachers lose hours a week building lessons from scratch. Most AI
> tools give them a draft. An outline. A starting point. Then the teacher
> still has to write the activity, build the assessment, figure out the
> engagement, and assemble it into something they can actually teach.
>
> TLC finishes the job.

**Narration word count:** ~55 words
**Timing:** ~20 seconds at 170 wpm

### On-screen during VO
- 0:05–0:10: landing page loads, camera pans slowly down the hero
- 0:10–0:15: hover over the three-card assistant intro (Hunter /
  Christine / Gemma 4) — each card briefly highlights
- 0:15–0:25: click "Create a Lesson" — smooth transition into `/create`

---

## Act 2 — The Product (0:25–1:55)

### Sub-act 2a: The Input (0:25–0:45)

### Voiceover

> Here's what a teacher gives TLC: a topic, a grade level, and
> optionally, their own source material. Today I'm teaching
> photosynthesis to 5th graders in 45 minutes, and I'm dropping in a
> paragraph from the Next Generation Science Standards for grade-level
> anchoring.

### On-screen actions
- 0:25: type "Photosynthesis" in the topic field (fast, intentional)
- 0:30: select "5th grade" from grade level dropdown
- 0:33: select "45 min" from class length
- 0:36: click "Add source material", paste a short NGSS paragraph
- 0:42: click "Start Building"

**Timing:** ~20 seconds, matching VO pace

---

### Sub-act 2b: The Collaboration — the money shot (0:45–1:25)

### Voiceover

> Now the interesting part. TLC uses two Gemma 4-powered Teacher's Assistants,
> Hunter and Christine. Hunter handles structure and rigor — the
> lesson sequence, the assessment, the time math. Christine handles
> depth and engagement — the demonstration, the discussion prompts, the
> classroom-practical teacher notes.
>
> They run in parallel. You watch both of them contribute, live. And
> while Review checks the lesson, every fact-bearing term is
> cross-referenced against Wikipedia and Wikidata — so the lesson is
> auditable, not just well-formatted.

### On-screen actions
- 0:45: the screen transitions — assistant panels appear side by side
- 0:47–1:00: tokens stream into Hunter's panel (bullet items appear):
  - "✓ Objective locked"
  - "✓ 6 steps, 45 min total"
  - "✓ Time math checks out"
  - "✓ Assessment: 3-question exit ticket"
- 0:50–1:05: simultaneously Christine's panel streams:
  - "✓ Hook: 'if farmers water crops...'"
  - "✓ Demo: plastic bag on leaf"
  - "✓ Teacher note: slow down at 'plants make their own food'"
  - "✓ 3 misconceptions flagged"
- 1:05: phase indicator advances from Build to Review
- 1:08–1:20: Review panel populates — grade fit, source alignment,
  issues with severity, **and the source-verification block fills in:
  every vocabulary term gets a green "Verified" badge with a Wikipedia
  / Wikidata link**. Linger on this for ~3 seconds — it's the
  anti-hallucination story made visible.
- 1:20: phase advances to Package; assistant panels pulse again as they
  finalize
- 1:25: completion moment — panels collapse into summary bar, lesson
  title fades in

**This is the moment the video earns the product.** Don't cut it short;
judges need to see both Teacher's Assistants actively working.

---

### Sub-act 2c: The Output (1:25–1:55)

### Voiceover

> Fifty-eight seconds later, here's what the teacher gets. Not an
> outline — a complete teaching kit. Materials, step-by-step plan with
> timed sections, a hands-on demonstration using a plastic bag and a
> live plant, discussion prompts, an exit ticket with answer key, and
> notes on common student misconceptions. Every section is labeled with
> its source: grounded in the teacher's NGSS paragraph, scaffolded
> around it, or generated and flagged for review.

### On-screen actions
- 1:25: click "Plan" tab — show the 6 timed lesson steps with source
  pills visible
- 1:33: click "Materials" — show the specific list (not abstract
  "resources")
- 1:37: click "Activities" — show the demo with its teacher tip
- 1:42: click "Assessment" — show the exit ticket questions + expected
  answers
- 1:47: click "Notes" — show the misconceptions section, scroll to
  discussion prompts
- 1:50: hover over a source-origin pill — tooltip appears: "Grounded:
  traces directly to your NGSS excerpt"

---

## Act 3 — The Close (1:55–2:30)

### Voiceover

> TLC isn't claiming to replace teacher expertise. It's claiming to save
> teachers the 90 minutes it takes to build a lesson from scratch.
> Every output is designed for teacher review before it enters a
> classroom. Source material stays on the server for one hour, then
> disappears.
>
> Built on Gemma 4. Open source. No accounts, no tracking, no lock-in.
> Every teacher deserves TLC.

### On-screen actions
- 1:55: click the "Download .md" button — markdown file opens in a new
  tab
- 2:02: brief pan through the markdown content — shows it's plain text
  ready to paste anywhere
- 2:08: cut back to landing page
- 2:12: footer visible with "Built on Gemma 4 • MIT License • No
  tracking • Open repo"
- 2:20: final frame: TLC logo + tagline "Every Teacher Deserves TLC" +
  the live demo URL
- 2:28: fade to black
- 2:30: end

---

## Alternate Opens (A/B Test)

### Open A (quiet / pensive)
Start on the messy desk. No music. Teacher's hands visible for 3
seconds, typing into a blank lesson template. Then the voiceover begins.
Music fades in at 0:15.

### Open B (direct / punchy)
Start cold on the landing page. Music bed from 0:00. Voiceover begins at
0:02 over the hero text. No desk shot.

**My recommendation:** record both, pick in edit. Open B is safer for
Kaggle judges who don't want to wait for narrative. Open A is more
human if the desk shot is clean.

---

## Recording Logistics

### Setup
- **Screen:** MacBook Pro 14" or similar; record at native resolution
  (2880×1800), export at 1080p
- **Recorder:** Screen Studio (Mac) or OBS (cross-platform); Screen
  Studio handles smooth cursor + auto-zoom well
- **Audio:** USB mic minimum (Blue Yeti or equivalent); 48kHz 24-bit;
  record in a quiet room with soft furnishings
- **Browser:** clean Chrome profile, no extensions visible, bookmarks
  hidden, no open tabs except TLC

### Test Run Before Real Recording
1. Run the full flow once without recording
2. Time it — note where the generation actually lands (varies ±10 sec)
3. Adjust VO pacing if generation is faster/slower than 60s
4. Record a 15-sec audio test, listen on headphones for room noise

### During Recording
- Record narration in one clean take to a separate audio file; sync in
  post. This is cheaper than re-recording screen capture if you flub a
  word
- Record the full flow as one long screen capture, plus separate
  captures of the messy desk + any cuts
- Budget 5 takes of narration, 3 of the screen flow
- Don't edit to match a pre-written timing; write 2-3 alternate VO
  lengths for each scene and pick the one that fits the footage

### Post
- Cut footage to narration, not narration to footage
- Music: pick one bed, keep it under -18dB when VO is present
- Add subtle captions for the VO (accessibility + Kaggle plays on
  muted autoplay)
- Export at 1080p H.264, 8-12 Mbps
- Upload to YouTube unlisted; embed link in Kaggle writeup

---

## Word-Count-Calibrated Script (for printing while recording)

### Single-page version

> (0:05) Teachers lose hours a week building lessons from scratch. Most
> AI tools give them a draft. An outline. A starting point. Then the
> teacher still has to write the activity, build the assessment, figure
> out the engagement, and assemble it into something they can actually
> teach.
>
> (0:20) TLC finishes the job.
>
> (0:25) Here's what a teacher gives TLC: a topic, a grade level, and
> optionally, their own source material. Today I'm teaching photosynthesis
> to 5th graders in 45 minutes, and I'm dropping in a paragraph from the
> Next Generation Science Standards for grade-level anchoring.
>
> (0:45) Now the interesting part. TLC uses two Gemma 4-powered Teacher's Assistants,
> Hunter and Christine. Hunter handles structure and rigor — the lesson
> sequence, the assessment, the time math. Christine handles depth and
> engagement — the demonstration, the discussion prompts, the
> classroom-practical teacher notes.
>
> (1:00) They run in parallel. You watch both of them contribute, live.
> And every fact-bearing term gets cross-referenced against Wikipedia
> and Wikidata — auditable, not just well-formatted.
>
> (1:25) Fifty-eight seconds later, here's what the teacher gets. Not
> an outline — a complete teaching kit. Materials, step-by-step plan
> with timed sections, a hands-on demonstration using a plastic bag and
> a live plant, discussion prompts, an exit ticket with answer key, and
> notes on common student misconceptions. Every section is labeled with
> its source: grounded in the teacher's NGSS paragraph, scaffolded
> around it, or generated and flagged for review.
>
> (1:55) TLC isn't claiming to replace teacher expertise. It's claiming
> to save teachers the 90 minutes it takes to build a lesson from
> scratch. Every output is designed for teacher review before it enters
> a classroom. Source material stays on the server for one hour, then
> disappears.
>
> (2:15) Built on Gemma 4. Open source. No accounts, no tracking, no
> lock-in. Every teacher deserves TLC.
>
> (2:30) [end]

**Word count:** ~385 words
**Runtime at 170 wpm:** 2:16
**Buffer for pauses + visual beats:** 14 seconds

---

## Thumbnail / Poster Frame

For the Kaggle submission + YouTube upload, the thumbnail should be:

- **Left half:** Hunter's avatar + "Structure & Rigor"
- **Right half:** Christine's avatar + "Depth & Engagement"
- **Center overlay:** "TLC — Every Teacher Deserves TLC" in the serif
  display font
- **Bottom bar:** "Built on Gemma 4" with small Gemma logo

Judges scrolling through submissions see the Teacher's Assistants + the Gemma
attribution instantly. That's the hook.

---

## What to Skip (Even If Tempted)

- **Don't show the code.** Judges can inspect the repo themselves. This
  video is about the product experience.
- **Don't explain the architecture.** Save that for the Kaggle writeup.
- **Don't do a personal intro.** Cold open into the problem.
- **Don't apologize for the demo running live.** The flow IS the demo;
  if it's slow, that's because Gemma 4 is real work happening.
- **Don't overstate accuracy.** We do not say "TLC generates perfectly
  accurate lessons." We say "source-grounded lessons designed for
  teacher review." This posture reads as honest and is more defensible
  when judges scrutinize.
- **Don't cram the full feature list.** The bullet points of "what TLC
  produces" belong in the writeup, not the video. The video shows 4-5
  output sections, enough to convey completeness.

---

## Post-Submission Video (Optional)

If we make the finals or get feedback post-submission, a 5-minute
"deep dive" video for the community is worth making:
- More on the architecture
- Walkthrough of the assistant prompt design
- Source-grounding demonstration with a real PDF
- Behind-the-scenes on the merge logic

Not part of the MVP scope. Listed here so we remember to consider it.

---

## Summary

- **2:30 target runtime; 3:00 hard cap**
- **Three acts:** Problem (0:25) → Product (1:30) → Close (35s)
- **The money shot:** Hunter + Christine streaming in parallel at 0:45–1:25
- **Record narration separately** and sync in post
- **A/B the open** — two versions, pick in edit
- **385 words of script, room for visual beats**

The video's job is to make a judge say "okay, that's genuinely a
product" within the first 30 seconds, and "I'd show this to a teacher
I know" by the end.
