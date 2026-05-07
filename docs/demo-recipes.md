# Demo recipes — topics that produce useful verification states

Curated input recipes for the 2:30 demo video and screenshot gallery.
Each one is engineered to put the verification block into a *visible*
state — green checks, a flagged contradiction, or a malformed standards
code — so the camera has something to land on.

> Test every recipe end-to-end on the live deploy at least 24 hours
> before recording. Wikipedia / Wikidata redirect behavior shifts
> occasionally and a recipe that worked last week may need a fresh
> term.

---

## Recipe A — All-green primary demo

**Purpose:** the main flow in the video. Vocabulary terms all hit
Wikipedia + Wikidata cleanly. Verification block displays a row of
green "Verified" badges.

| Field | Value |
|---|---|
| Topic | `Photosynthesis` |
| Grade | `5th grade` |
| Class length | `45 minutes` |
| Subject | `Science` |
| Source | NGSS 5-LS1-1 anchor paragraph (below) |

**Suggested NGSS source paragraph to paste:**

> Plants need water, carbon dioxide, and energy from the sun to make
> their own food. They use a process called photosynthesis to convert
> these inputs into glucose and oxygen. Most of the matter that makes
> up a plant — its stems, leaves, and roots — comes from the air, not
> from the soil. (Aligned to NGSS 5-LS1-1.)

**Expected verification:** "photosynthesis," "chlorophyll," "glucose,"
and "oxygen" all hit Wikipedia. Wikidata corroborates with one-line
descriptions. NGSS code `5-LS1-1` validates against the regex.

**Why this is the primary recipe:** matches the existing DEMO_SCRIPT
walkthrough (plastic-bag demo, 6 steps, exit ticket). Lowest risk.

---

## Recipe B — Contradiction caught (B-roll for the verification beat)

**Purpose:** show the verifier earning its keep. Provide a source that
contains a deliberately wrong fact; watch the verifier flag the
vocabulary term that derives from it. The regenerate-on-must-fix loop
then rewrites the lesson using the Wikipedia excerpt that's spliced
into the retry prompt.

| Field | Value |
|---|---|
| Topic | `The water cycle` |
| Grade | `4th grade` |
| Class length | `40 minutes` |
| Subject | `Science` |
| Source | misleading paragraph (below) |

**Suggested source paragraph (contains one wrong fact):**

> The water cycle is the path water takes around Earth. Evaporation
> happens when liquid water turns into water vapor. **Condensation
> happens when water vapor turns into ice crystals high in the
> atmosphere.** Precipitation falls when clouds get too heavy.

**The bait:** condensation is the gas-to-liquid transition; the
gas-to-solid transition is *deposition* (or sometimes loosely called
sublimation in the reverse direction). Wikipedia and Wikidata both
clearly define condensation as the transition from gas to liquid.

**Expected verification:** if the model uses the source's wrong
definition, the verifier flags `condensation` as `contradicted`. The
regenerate cycle then fires; the second build emits the corrected
definition (citing Wikipedia in its retry context). The judge inspector
shows `timings.retried_due_to_must_fix: true` and the verification
block transitions from red → green.

**Caveat:** Gemma 4 is fairly aggressive about ignoring obviously-wrong
source paragraphs in favor of its priors. If the contradiction doesn't
trigger on the first try, switch to a more subtle bait (e.g., wrong
date for a historical event, swapped roles between two scientists).

---

## Recipe C — Standards-code mismatch (judge-mode B-roll)

**Purpose:** show the standards-code validator catching a fabricated
NGSS code. Useful as a 2-second insert during the writeup screencast,
not the main video.

| Field | Value |
|---|---|
| Topic | `Animal adaptations` |
| Grade | `3rd grade` |
| Class length | `30 minutes` |
| Subject | `Science` |
| Source | none (let Gemma cite codes from priors) |

**Expected behavior:** Gemma usually cites real NGSS codes for animal
adaptations (`3-LS4-2` or similar). Occasionally it fabricates one. To
force a deterministic catch, manually edit the seeded Phase 3 output
(or use the judge inspector to inject a bad code) and rerun the
verification step.

**Easier alternative for B-roll:** screenshot the verification block
from a run where you've manually injected `3-FAKE-99` into the
standards alignment. The validator's regex flags it as
`should_fix` with the format hint visible.

---

## Recipe D — "Not found" gracefully handled

**Purpose:** show the verifier behaving sensibly when terms aren't on
Wikipedia. Keeps the honesty posture intact — the system flags
"unverified" rather than over-claiming verification.

| Field | Value |
|---|---|
| Topic | `Classroom routines for the first week of school` |
| Grade | `Kindergarten` |
| Class length | `25 minutes` |
| Subject | `Social-Emotional Learning` |
| Source | none |

**Expected verification:** vocabulary terms like "carpet time,"
"morning meeting," "buddy partner" are pedagogical jargon, not
encyclopedia entries. Wikipedia lookups return 404; the verification
block displays them as gray "Not found" entries with a footnote
explaining that not every K-12 term is a Wikipedia article. No issues
flagged. This is the "we know our limits" demo.

---

## Edge cases worth testing once

1. **Disambiguation pages** — terms like "mercury" or "saturn" hit
   Wikipedia disambiguation pages. The verifier should display
   "Wikipedia returned a disambiguation page; reference is ambiguous."
2. **Foreign-language terms** — vocabulary in non-English (Spanish ELL
   lessons, Latin biology terms). Wikipedia's English REST endpoint
   may 404; Wikidata may still return a multilingual hit.
3. **Proper nouns** — names of people, events, books. Hits Wikipedia
   reliably; Wikidata returns a person/work entity.
4. **Slow Wikipedia responses** — the 4-second `FETCH_TIMEOUT_MS` cap
   means a slow request returns "not found" rather than blocking the
   pipeline. Worth confirming the UX is graceful when it fires.

---

## Pre-recording checklist

- [ ] Run Recipe A end-to-end on prod, confirm all vocab terms
      verified
- [ ] Run Recipe B once and confirm the contradiction triggers
      regenerate (look at `?judge=1` for `retried_due_to_must_fix`)
- [ ] Capture B-roll screenshot of Recipe C with a deliberately
      malformed code
- [ ] Run Recipe D and confirm "Not found" rendering
- [ ] Check that source-origin pills + verification badges are both
      visible without scrolling on a 1080p capture
- [ ] Verify Wikipedia + Wikidata source links are clickable in the
      rendered page
