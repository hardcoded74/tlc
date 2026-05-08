# TLC demo — narration draft (2:30 target)

Three acts at roughly 50 seconds each, narrated over screen capture.
Word count target: ~280–300 (≈ 110 wpm read, conversational pace).

---

## ACT I — The problem (0:00–0:50)

**Visual:** Landing page hero, "Every teacher deserves TLC." Click `Try TLC`.
Cut to the `/create` form. Type *Photosynthesis · 5th grade · 45 minutes ·
Science*. Paste the NGSS 5-LS1-1 anchor paragraph in the source field.

**Narration (~85 words):**

> Teachers are paid to teach. Yet most lesson planning happens after hours,
> at a kitchen table, late at night — pulling worksheets from one tab,
> standards from another, hoping the misconceptions you caught last year
> are still in your head this year.
>
> TLC is a lesson-building tool that takes the prep off the pile. You give
> it a topic, a grade level, and how long your class runs. Two collaborating
> AI specialists — Hunter and Christine — each draft a complete lesson, and
> a third pass reconciles them.

---

## ACT II — The build (0:50–1:40)

**Visual:** Click `Generate`. The lesson page loads. Phase pipeline shows
Build → Review → Package with the dot-wave on the active phase. Hunter and
Christine cards stream side-by-side. While You Wait card visible.

**Narration (~95 words):**

> Hunter handles structure. Lesson steps, assessment questions, the
> standards code. Rigor.
>
> Christine handles depth. The hook, the misconceptions, the discussion
> prompts. Engagement.
>
> They work in parallel — neither sees the other's draft. Then Phase Two
> audits both and cross-references every vocabulary term and misconception
> correction against Wikipedia and Wikidata. Live, while you watch.
>
> *(Pause for verifier callout.)*
>
> If a definition contradicts the source, it becomes a must-fix issue.
> Phase Three regenerates the affected fields with the trusted source
> excerpt spliced into the prompt — so the model corrects itself from the
> reference, not from a vague instruction to try harder.

---

## ACT III — The result (1:40–2:30)

**Visual:** Final lesson package fills in. Tabs: Plan, Materials, Activities,
Assessment, Notes. Section ownership ribbon: Hunter (blue), Christine
(terracotta), Both. Click `Download Markdown`. File saves. Cut to the
moon-phases gallery seed showing the verification block with one
contradicted finding flagged and resolved.

**Narration (~95 words):**

> The output is a complete lesson package. Objective, steps, assessment,
> teacher notes, accommodations, the misconceptions block — every section
> attributed to the persona who owns it. Download as Markdown, HTML, or
> JSON. Or share by link.
>
> Every claim that could be fact-checked has been. Standards codes are
> regex-validated against the published NGSS and Common Core formats.
> Source-grounded claims are flagged as such; generated material is
> labeled honestly.
>
> A teacher's prep time, in two minutes. With a paper trail.

**End card:** *TLC — tlc-hardcoded74s-projects.vercel.app — built with
Gemma 4 for the Gemma 4 Good Hackathon.*

---

## Notes for the take

- **Total wall-clock runtime is ~60–180 seconds** on the paid lane; the
  While You Wait card is meant to fill those seconds with real
  information about what's happening. If you talk over the wait, time the
  Phase Two callout to land while the verifier is actually working.
- The **moon-phases seed** (`/lesson/0d73cbf9-d7f5-5296-a756-4536c973c865`)
  is the deliberate manufactured-contradiction example — a vocabulary
  term flagged by the verifier and corrected. Use it as B-roll for the
  "if a definition contradicts" beat.
- If the run feels long, cut. The recipe is anchored well enough that you
  can record one clean take and edit the wait down to a tight 10-second
  sequence.
- The persona portraits at the top of each card are illustrated by SDXL
  running locally on an Intel Arc B570 — worth a one-line aside for the
  hackathon judges if it fits.
