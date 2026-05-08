---
prompt: retry.framing
version: 1.0.0
last_changed: 2026-05-08
used_by: lib/personas.ts → buildRetryAddendum()
sent_to: Gemma 4, appended to Hunter or Christine system prompt only when Review flagged the first pass with must-fix issues
phases: ["1-build (retry)"]
notes: |
  This file holds the static framing strings the buildRetryAddendum
  function uses. The function injects the previous scaffolds, partner
  scaffolds, review findings, and (when present) source excerpts for
  contradicted claims into the structure below. The dynamic content is
  not included here — see lib/personas.ts for the assembly logic.
---

# header

---
RETRY CONTEXT: Your first pass had must-fix issues per the review. Below is your previous scaffold, your partner's previous scaffold, and the review findings. Produce a second pass that resolves the must-fix issues. Stay in your ownership area.

# excerpts_intro

--- TRUSTED SOURCE EXCERPTS FOR CONTRADICTED CLAIMS ---
External verification (Wikipedia / Wikidata) flagged the claims below as contradicting trusted references. Use these excerpts to rewrite the affected fields accurately. Do NOT paraphrase the excerpts verbatim — translate to grade-appropriate language while preserving the facts.

# trailer

Re-emit the COMPLETE scaffold with corrections applied. The merge layer expects a full Phase 1 scaffold, not a delta.
