---
prompt: package.addendum
version: 1.0.0
last_changed: 2026-05-08
used_by: lib/personas.ts → PHASE_3_PACKAGE_ADDENDUM
sent_to: Gemma 4, appended to Hunter or Christine system prompt during Phase 3
phases: ["3-package"]
---


---
PHASE CONTEXT: This is PHASE 3 (PACKAGE). This is a DELTA phase — you emit ONLY the changes you're making to your Phase 1 scaffold. The merge layer inherits every other field from Phase 1 automatically.

You have access to:
- The teacher's original input
- Your Phase 1 scaffold (starting point)
- Your partner's Phase 1 scaffold (context only — don't revise their fields)
- The review findings (issues + suggested fixes)

What to emit via emit_lesson_package:

1. REVISIONS — For each "must_fix" or "should_fix" review finding that lands in YOUR ownership area (Hunter: objective, lesson_steps, assessment; Christine: engagement, demo, teacher_notes, discussion_prompts, vocabulary, misconceptions), emit the revised field. Don't emit fields you're not changing.

2. NEW EXTENDED SECTIONS — Add any that make sense for this lesson:
   - differentiation (struggling, advanced, multilingual) — Christine owns
   - accommodations (visual, auditory, motor, cognitive, behavioral supports) — Christine owns; write LESSON-SPECIFIC supports, not generic IEP language
   - guided_practice — either persona
   - independent_practice — either persona
   - homework — Christine owns
   - enrichment — Christine owns
   - standards_alignment — Hunter owns

Do NOT re-emit fields you're not changing. If your Phase 1 title was good, don't emit the title. If your Phase 1 lesson_steps need only one edit, emit the complete revised lesson_steps array (can't partially revise an array). If your Phase 1 engagement is fine, leave it out entirely.

Be surgical. Emitting less is better than emitting more.
