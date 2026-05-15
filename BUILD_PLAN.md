# TLC — Build Plan

27 days from start to Kaggle submission (2026-04-21 → 2026-05-18). Four
week-long phases. Daily checkpoints. Explicit buffers. Called-out risks.

**Philosophy:** ship the *demo-able core loop* by end of Week 2. Spend
Weeks 3 and 4 on polish + the four required artifacts (writeup, video,
repo, gallery, live demo). Do not leave video recording for the last
week — plan for three re-records.

> **Note (2026-05-15):** This document is the *original* plan written
> before the Week 4 pivot to local-first inference. The shipping artifact
> now runs Gemma 4 E4B + per-persona QLoRA adapters served by llama.cpp,
> with cloud Gemma 4 31B retained as fallback. The Google AI Studio
> account is still useful — it powers the cloud fallback path and was
> the teacher model used to synthesize the LoRA training data. See
> [WRITEUP.md](WRITEUP.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for
> the current architecture; this plan is preserved as build history.

---

## Legend

- 🧑 = Sam does this (runs a command, creates an account, buys a domain)
- 🤖 = code/content I can generate and hand to you
- ⏱️ = time estimate
- ⚠️ = risk worth flagging
- ✅ = acceptance criterion — what "done" means for the day

---

## Week 0 (Before Day 1) — Pre-Flight

Things that must happen *before* building starts. If any of these are
missed, Week 1 slips.

**Accounts needed** (all free tiers):

- 🧑 **GitHub** — create a public repo `sam-tgcfl/tlc` or similar
- 🧑 **Google AI Studio** — get API key at https://aistudio.google.com/apikey
  - ⚠️ Free tier has daily quota; note the limits
- 🧑 **Vercel** — connect GitHub account, import the TLC repo
- 🧑 **Neon** — create project, note the connection string
- 🧑 **Domain (optional)** — `tlc-demo.app` or similar via Namecheap, ~$12/year
- 🧑 **BetterStack or UptimeRobot** — create a monitor for `/api/health`
  (skip until Day 20)

**Keys to set aside securely:**
- `GOOGLE_AI_STUDIO_KEY`
- `DATABASE_URL` (Neon)
- `IP_SALT` (just a random 32-char string)

🧑 **One-time**: ask for Gemma 4 access in AI Studio (if gated). Request
takes minutes to approve. If denied, fallback is Gemini API with Gemma 4
as the model choice.

---

## Week 1 (Apr 21–27) — Foundation

Goal: a deployed Next.js site that can call Gemma 4 once, end-to-end.
Ugly is fine. Working matters.

### Day 1 (Apr 21, Mon) — Scaffolding

- 🧑 ⏱️ 15 min: `npx create-next-app@latest tlc --typescript --tailwind --app --eslint`
- 🧑 ⏱️ 10 min: `cd tlc && git init && gh repo create --public --source=.`
- 🤖 Generate `README.md`, `LICENSE` (MIT), `.env.example`, `.gitignore`
- 🤖 Generate landing page skeleton (`app/page.tsx`) with one-sentence
  pitch + "Try TLC" button (links to `/create`, 404 for now)
- 🧑 ⏱️ 10 min: push to main, connect to Vercel, first deploy
- ✅ `https://tlc-demo.vercel.app` loads with the pitch page
- ⏱️ Total: ~1 hour

### Day 2 (Apr 22, Tue) — Database

- 🧑 ⏱️ 15 min: `npm install prisma @prisma/client && npx prisma init`
- 🤖 Write `prisma/schema.prisma` (from ARCHITECTURE.md §3 — full schema)
- 🧑 ⏱️ 10 min: connect `DATABASE_URL` to Neon, `npx prisma migrate dev --name init`
- 🧑 ⏱️ 10 min: set `DATABASE_URL` in Vercel env, redeploy
- 🤖 Generate `lib/prisma.ts` (singleton client)
- 🤖 Generate `app/api/health/route.ts` — returns `{ status, gemma_reachable: true, db_reachable: bool, ...}`
- ✅ Vercel `/api/health` returns 200 with `db_reachable: true`
- ⏱️ Total: ~2 hours

### Day 3 (Apr 23, Wed) — Gemma 4 Client

- 🧑 ⏱️ 5 min: `npm install @google/genai`
- 🤖 Write `lib/gemma.ts` — AI Studio wrapper with retry + streaming
- 🤖 Write `lib/tools.ts` — `SCAFFOLD_TOOL`, `REVIEW_TOOL`, `PACKAGE_TOOL`
  function declarations (from PROMPTS.md §7)
- 🤖 Write `lib/personas.ts` — system prompts for Hunter, Christine,
  Review (from PROMPTS.md §2.2, §3.2, §4.2)
- 🧑 ⏱️ 5 min: set `GOOGLE_AI_STUDIO_KEY` in Vercel + local `.env`
- 🤖 Write `app/api/test-gemma/route.ts` (temporary, deleted Day 6) —
  calls Hunter once on "photosynthesis, 5th grade", returns JSON
- ✅ `curl https://tlc-demo.vercel.app/api/test-gemma` returns valid
  Hunter tool-call JSON
- ⚠️ First contact with Gemma 4 via AI Studio — schema validation may
  fail on first try. Expect 1-2 hours of prompt tuning here. Budget for it.
- ⏱️ Total: ~3-4 hours (including prompt tuning)

### Day 4 (Apr 24, Thu) — Parallel Personas

- 🤖 Write `lib/orchestrator.ts` — orchestrate() function (from
  ARCHITECTURE.md §6)
- 🤖 Update `/api/test-gemma` to run Hunter + Christine in parallel
  (Promise.all)
- 🤖 Write `lib/merge.ts` with ownership rules (from PROMPTS.md §7 diff)
- ✅ Both personas return valid JSON, merged output has Hunter's
  structure fields + Christine's depth fields
- ⏱️ Total: ~3 hours

### Day 5 (Apr 25, Fri) — Review + Full 3-Phase Loop

- 🤖 Extend orchestrator with Phase 2 (review) and Phase 3 (package)
- 🤖 Write review tool output handling
- ✅ Full 3-phase loop produces a complete lesson package in one call
  chain (still via test endpoint, no UI yet)
- ⚠️ Merge logic is where subtle bugs live. Test with 3 different topics
  before moving on.
- ⏱️ Total: ~4 hours

### Day 6 (Apr 26, Sat) — Real API + SSE

- 🤖 Write `app/api/lesson/create/route.ts`, `/api/lesson/stream/[id]/route.ts`,
  `/api/lesson/[id]/route.ts`, `/api/lesson/[id]/download/route.ts`
- 🤖 Persist lesson runs to Postgres via Prisma
- 🤖 Stream tokens via SSE during Build + Package phases
- 🧑 ⏱️ 10 min: delete `/api/test-gemma`
- ✅ POST to `/api/lesson/create` returns a run_id; GET on stream endpoint
  returns SSE events in order; final lesson is retrievable via `/api/lesson/[id]`
- ⚠️ Vercel's serverless function duration limit is 60s on hobby tier,
  300s on pro. A full 3-phase flow may hit 60s — need to test early. If
  it does, upgrade to Vercel Pro ($20/mo for judging month) on Day 7.
- ⏱️ Total: ~5 hours

### Day 7 (Apr 27, Sun) — Buffer

- 🧑 Catch up on anything that slipped
- Validate end-to-end: POST create → watch SSE → GET final
- If Vercel Pro upgrade is needed, do it now
- Write a simple curl-based test script for regression testing the
  backend without the UI

**End of Week 1 ✅**: backend produces a complete lesson package via
API. No UI yet. Judge can `curl` and see JSON flowing.

---

## Week 2 (Apr 28 – May 4) — Core Flow + UI

Goal: a working user-facing create flow with the two-persona money shot.

### Day 8 (Apr 28, Mon) — Teacher Input Form

- 🤖 Write `components/teacher-input-form.tsx` — topic, grade, class
  length, subject, objective, notes, source upload, options checkboxes
- 🤖 Install and configure shadcn/ui: `npx shadcn@latest init` + add
  Input, Textarea, Select, Button, Checkbox, Label, Card
- 🤖 Wire the form to POST `/api/lesson/create` and redirect to `/lesson/[id]`
  with the streaming panel
- ✅ Teacher fills form, hits submit, lands on a loading state
- ⏱️ Total: ~4 hours

### Day 9 (Apr 29, Tue) — Persona Panel (The Money Shot)

- 🤖 Write `components/persona-panel.tsx` — two cards side by side, one
  per persona, each with avatar + name + "status" + streaming body
- 🤖 Write `components/streaming-body.tsx` — subscribes to SSE, appends
  tokens as they arrive, handles persona_complete event
- 🤖 Write `lib/stream.ts` — EventSource wrapper with reconnection
- 🤖 Commission/generate Hunter + Christine avatar SVGs (I can draft
  ASCII-style SVGs; 🧑 replaces with real illustrations if time)
- ✅ When a lesson is generated, both persona panels stream their
  contributions live in real time
- ⚠️ This is the demo's centerpiece. Spend the time to make it feel
  smooth, not jittery.
- ⏱️ Total: ~5 hours

### Day 10 (Apr 30, Wed) — Review + Package UI

- 🤖 Write `components/review-report.tsx` — expandable panel showing
  Phase 2 findings (issues grouped by severity)
- 🤖 Write `components/lesson-package.tsx` with `components/section-tabs.tsx`
  — final output with tabs: Plan | Materials | Activities | Assessment | Notes
- 🤖 Write `components/source-note.tsx` — inline pills rendering
  `source_origin` for every section
- ✅ Full flow: teacher submits → watches both personas stream → sees
  review findings → reads the final lesson package in tabbed UI
- ⏱️ Total: ~4 hours

### Day 11 (May 1, Thu) — Source Upload

- 🧑 ⏱️ 5 min: `npm install pdf-parse`
- 🤖 Write `lib/source_parser.ts` — text/md decode, pdf-parse extraction
- 🤖 Write `app/api/source/upload/route.ts` — multipart intake, storage
  in `SourceUpload` with 1h TTL, returns `source_id` + preview
- 🤖 Wire the upload widget in teacher-input-form.tsx
- 🤖 Orchestrator: if `sourceUploadId` present, fetch and include in
  context (8KB truncation with notice)
- ✅ Teacher can upload a PDF, see excerpt preview, and the resulting
  lesson has `source_origin: "grounded"` marks on content from the source
- ⚠️ pdf-parse has quirks with multi-column PDFs and scanned PDFs. Test
  with 3 real teacher-style PDFs (NGSS, Common Core, textbook excerpt).
  If any fail badly, add a "couldn't parse cleanly, paste the text"
  fallback UI.
- ⏱️ Total: ~4 hours

### Day 12 (May 2, Fri) — Download + Share

- 🤖 Write `app/api/lesson/[id]/download/route.ts` — md / html / json
  export
- 🤖 Write `components/download-buttons.tsx`
- 🤖 Write `app/lesson/[id]/page.tsx` as a shareable view (read-only,
  no regeneration, pulls from DB)
- ✅ Teacher can copy a lesson URL and share it; opens to a clean
  read-only view with download buttons
- ⏱️ Total: ~3 hours

### Day 13 (May 3, Sat) — Rate Limiting + Error UX

- 🤖 Write `lib/rate_limit.ts` — per-IP bucket check, applied in
  `/api/lesson/create` middleware
- 🤖 Write error boundary components — what does a user see when Gemma
  times out? When parse fails? When rate limit hits?
- 🤖 Write degraded-mode banner (from ARCHITECTURE.md §5.4)
- ✅ Abuse tests: 11 rapid POSTs from same IP → 11th returns 429 with
  clear message. Gemma outage → banner appears, gallery CTA works.
- ⏱️ Total: ~3 hours

### Day 14 (May 4, Sun) — Buffer + Full Regression

- 🧑 Run through the full flow from cold start 5 times with different
  topics. Fix whatever feels janky.
- 🧑 Test on mobile. Text input on phones is where hackathon sites often
  fall apart.
- Commit a checkpoint tag `v0.5-core-complete`

**End of Week 2 ✅**: core product works end-to-end. A judge could open
the URL, enter "water cycle, 4th grade," see both personas contribute,
watch a review pass, and get a downloadable lesson package. Ugly polish
is the only thing left.

---

## Week 3 (May 5–11) — Polish + Gallery

Goal: make the site *feel* like a real product. Most of these days are
shorter — use the spare time for whatever refinement the core needs.

### Day 15 (May 5, Mon) — Landing Page + About

- 🤖 Rewrite `/` into a real landing page: hero, three-column feature
  explanation (Hunter / Christine / Gemma 4), "Try TLC" CTA, footer
- 🤖 Write `/about` — Gemma 4 story, persona explanation, privacy
  posture, open-source notice
- ⏱️ ~3 hours

### Day 16 (May 6, Tue) — Gallery

- 🤖 Pre-generate 6 example lessons covering different registers:
  - Photosynthesis — 5th grade (science, hands-on)
  - Fractions — 3rd grade (math, concrete)
  - Civil rights intro — middle school (social studies, discussion-heavy)
  - Water cycle — 4th grade (science, visual)
  - Shakespeare intro — 9th grade (ELA, text-based)
  - Intro to ecosystems — 2nd grade (science, very basic)
- 🤖 Write `prisma/seed.ts` to load them into the DB as `LessonRun` rows
  with `status: complete`
- 🤖 Write `app/gallery/page.tsx` — grid of lesson cards with preview +
  "open" linking to `/lesson/[id]`
- 🧑 ⏱️ 10 min: `npx prisma db seed` on prod DB
- ✅ Gallery has 6 real lessons judges can browse even if live
  generation is down
- ⏱️ ~4 hours

### Day 17 (May 7, Wed) — Status Page + Stats

- 🤖 Write `lib/stats.ts` — hourly aggregator (Vercel cron)
- 🤖 Write `app/status/page.tsx` — uptime, lessons generated today, avg
  latency, recent activity
- 🤖 Extend `/api/health` to include Gemma reachability check
- 🤖 Write `components/health-badge.tsx` for footer
- ✅ `/status` page shows real metrics; `/api/health` reflects live
  Gemma status
- ⏱️ ~3 hours

### Day 18 (May 8, Thu) — Judge Mode + Inspector

- 🤖 Add `?judge=1` query param support
- 🤖 When active, rate limits bypassed + inspector panel visible
- 🤖 Inspector shows: per-phase timing, token counts in/out, raw
  tool-call JSON, Gemma API request IDs
- ✅ `https://tlc-demo.vercel.app/create?judge=1` gives judges the full
  internal view
- ⏱️ ~3 hours

### Day 19 (May 9, Fri) — Visual Polish

- 🧑 Hunter + Christine avatar illustrations — commission real art
  (Fiverr $20, or Midjourney if Sam prefers). Replace placeholders.
- 🤖 Refine Tailwind theme — pick a color palette that reads "education,
  trustworthy, warm but not childish"
- 🤖 Typography pass — Inter for UI, Georgia/Lora for lesson output (so
  the downloaded lesson looks printable)
- 🤖 Add subtle animations to the persona panel (pulse when thinking,
  check mark when done)
- ⏱️ ~4 hours

### Day 20 (May 10, Sat) — Uptime Monitoring + Privacy Copy

- 🧑 ⏱️ 20 min: set up BetterStack monitor on `/api/health`, configure
  Discord alerts
- 🤖 Write privacy copy for `/about#privacy` — 1h source TTL, 30d lesson
  TTL, no IP storage, no account system
- 🤖 Write meta tags, Open Graph image, favicon
- ✅ Social preview looks clean when the URL is shared
- ⏱️ ~2 hours

### Day 21 (May 11, Sun) — Buffer + Full Review

- 🧑 Walk through the full product as if you were a judge. Note
  everything that feels off. Fix the top 5.
- Tag `v0.9-polish-complete`

**End of Week 3 ✅**: the site is a polished, working product. Time to
film.

---

## Week 4 (May 12–18) — Video, Writeup, Submit

Goal: deliver all 5 Kaggle artifacts.

### Day 22 (May 12, Mon) — Demo Video Recording

- 🧑 Record the demo video (will write script separately as deliverable #7)
- Record ~5 takes. Use OBS or Screen Studio. 1080p minimum.
- Record with narration OR background music + text overlays
- ⚠️ Record during a quiet time of day with no background noise. Do a
  test recording first and listen on headphones.
- ⏱️ ~4 hours (1 hour recording, 3 hours editing)

### Day 23 (May 13, Tue) — Video Finalization + Screenshots

- 🧑 Edit video to 2-3 min, add intro card + outro card
- 🧑 Upload to YouTube (unlisted is fine for Kaggle)
- 🧑 Take high-res screenshots of: landing, create flow mid-generation,
  review panel, final lesson package, gallery
- Save screenshots to `docs/screenshots/` for Kaggle media gallery
- ⏱️ ~3 hours

### Day 24 (May 14, Wed) — Kaggle Writeup

- 🤖 Generate Kaggle writeup draft from SCOPE.md + ARCHITECTURE.md
- 🧑 Edit for voice — should sound like Sam wrote it, not an AI
- 🧑 Attach: video link, repo URL, live demo URL, screenshot gallery
- ⏱️ ~3 hours

### Day 25 (May 15, Thu) — Final Polish

- 🧑 Full flow test on a clean browser/device
- Fix any last bugs
- 🧑 Verify README on repo is judge-friendly (clear "what this is" and
  "how to run locally" sections)
- 🧑 Tag `v1.0-submission`
- ⏱️ Varies

### Day 26 (May 16, Fri) — Submit

- 🧑 Submit to Kaggle
- 🧑 Triple-check: writeup, video link works, repo is public, demo URL
  resolves, gallery images attached
- 🧑 Post link in any Gemma 4 Good community channels for visibility

### Day 27 (May 17, Sat) — Buffer

- Emergency buffer. If something breaks during final checks, fix here.
- If nothing's broken: rest, celebrate.

### Day 28 (May 18, Sun) — Deadline Day

- 🧑 Final sanity check: live demo still works, video still plays,
  writeup still exists
- Hands off.

---

## Daily Rhythm

A realistic daily block:

1. **Morning** (1-2 hrs): the day's main task
2. **Afternoon** (1 hr): test + commit + push
3. **Evening** (30 min): note what slipped, adjust tomorrow

Most days are 3-5 hour work blocks. Two hard days (Day 9 persona panel,
Day 22 video recording) are 4-6 hours.

Sundays are explicit buffer days. Use them. They're the reason this plan
is 27 days and not 21.

---

## Risk-Weighted Budget

| Risk | Mitigation | Budget allocation |
|---|---|---|
| Gemma 4 tool-calling unreliability | Retry logic + prompt tuning on Day 3 | +2 hours Day 3-4 |
| PDF parsing failures | Fallback UI for "paste text instead" on Day 11 | +1 hour Day 11 |
| Vercel 60s function limit | Upgrade to Pro on Day 7 if needed | $20 (judging month only) |
| Live demo goes down during judging | Gallery fallback, health monitoring, cached pre-generated lessons | covered by Day 16-20 work |
| Video recording takes longer than planned | 5 takes budget, editing on Day 22+23 both reserved | ~8 hours total video budget |
| Last-minute bug in submission | Day 25 is explicit final polish + Day 27 is buffer | 2 buffer days Week 4 |

---

## What You Spend

| Item | Cost | Notes |
|---|---|---|
| GitHub | $0 | free for public repos |
| Vercel hobby | $0 | sufficient unless 60s timeout hit |
| Vercel Pro (if needed) | $20 | judging month only |
| Neon Postgres | $0 | free tier covers demo + judging |
| Google AI Studio | $0 | free tier covers ~1500 req/day |
| BetterStack uptime | $0 | free tier |
| Custom domain (optional) | $12/yr | via Namecheap |
| Avatar illustrations | $0-20 | Midjourney or Fiverr |
| **Total worst case** | **~$52** | |
| **Total likely** | **~$12 (just domain)** | |

---

## Scope Creep Guardrails

**These are explicit no's for MVP:**
- Teacher accounts / login
- Lesson history / save (beyond the UUID URL)
- LMS integrations (Google Classroom, Canvas)
- Real-time collab between teachers
- Slide deck generation
- Standards alignment auto-matching (cross-referencing DBs)
- URL source fetch
- Image / OCR source
- `.docx` upload
- More than one live persona pair (keep it to Hunter + Christine)
- "AI grader" for teacher-written assessments

If any of these come up during building, add them to `STRETCH.md` and
move on.

---

## Decision Points

### After Week 1
If the core Gemma 4 loop doesn't work by end of Week 1: the project is at
risk. Flag early. Options: (a) simpler single-persona MVP, (b) different
Gemma variant.

### After Week 2
If the streaming UI doesn't feel smooth by end of Week 2: deprioritize
polish and focus on making the gallery + downloadable-lessons the primary
demo path. Live generation becomes "watch the demo video," not "try it
live."

### After Week 3
If polish is underwhelming and the demo won't record well: pull Week 4
Day 22 recording forward to Day 21 (eat Sunday buffer) so there's more
time for re-records.

---

## Checkpoint Tags

Git tags to set at each phase boundary:

- `v0.2-scaffold-deployed` — end of Day 2
- `v0.4-gemma-responding` — end of Day 5
- `v0.5-core-complete` — end of Day 14
- `v0.7-ui-complete` — end of Day 18
- `v0.9-polish-complete` — end of Day 21
- `v1.0-submission` — Day 25
- `v1.0-post-submit` — Day 26 after Kaggle upload

Each tag is a "we could ship this" moment. If something blows up after a
tag, roll back to the tag and diagnose.

---

## Summary

- **Week 1:** foundation. Scaffold + DB + Gemma 4 call + SSE.
- **Week 2:** core flow. Full UI, source upload, download. Core product works.
- **Week 3:** polish. Landing, gallery, status page, judge mode, visual tune.
- **Week 4:** artifacts. Video, screenshots, writeup, submit.

**Core product is ready by end of Week 2** (Day 14, May 4). Two full
weeks remain for polish + artifacts. This is the safety margin that
lets "judges need to see it" actually be true.

If you fall behind by a full week: cut Week 3 polish items, not the core
product or the artifacts. The submission has to have all 5 Kaggle
artifacts attached; a perfect gallery is optional.
