# TLC — Technical Architecture (v2)

Opinionated stack. One language end-to-end, one deploy target, one
managed database. Optimized for: **a live demo that actually works when
judges click it**, plus polish that reads as real-product rather than
weekend-hack.

---

## 1. Stack at a Glance

```
┌────────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui   │
│                                                                │
│  Frontend:                                                     │
│    /                          landing page                     │
│    /create                    teacher input + live panel       │
│    /lesson/[id]               shareable lesson view            │
│    /gallery                   pre-generated example lessons    │
│    /about                     Gemma 4 + persona story          │
│                                                                │
│  Server:                                                       │
│    /api/source/upload         (multipart parser)               │
│    /api/lesson/create         (returns run_id)                 │
│    /api/lesson/stream/[id]    (SSE, token-by-token)            │
│    /api/lesson/[id]           (lesson package JSON)            │
│    /api/lesson/[id]/download  (md / html / json)               │
│    /api/stats                 (public: counts + latency)       │
│    /api/health                (uptime check)                   │
└──────────────┬──────────────────────────────┬──────────────────┘
               │                              │
               ▼                              ▼
    ┌──────────────────┐          ┌─────────────────────────┐
    │  Neon Postgres   │          │  Local llama.cpp        │
    │  (serverless)    │          │  Gemma 4 E4B + LoRAs    │
    │  Prisma ORM      │          │  Hunter / Christine     │
    └──────────────────┘          │  reached via Cloudflare │
                                  │  Tunnel + worker drain  │
                                  │                         │
                                  │  Fallback: Google AI    │
                                  │  Studio gemma-4-31b-it  │
                                  └─────────────────────────┘
```

**Deploy:** Vercel (frontend + API routes + SSE) + Neon (Postgres) +
local llama.cpp on an edge GPU (model) reached from Vercel via a
Cloudflare Tunnel. A long-running worker on the inference host drains
the Neon `pending` queue (`WORKER_MODE=1`), keeping orchestration off
Vercel's function ceiling. Google AI Studio (`gemma-4-31b-it` dense)
is retained as a cloud fallback.

---

## 2. Language Choice — TypeScript End-to-End

**Why not Python + FastAPI + React split:**
- Two languages = two deploy targets = two things that can be broken
- TypeScript end-to-end means judge-facing code is in ONE language, which
  is what "polished" looks like in a modern repo
- Next.js App Router supports server-side logic (API routes, server
  actions, streaming responses) natively — no separate Python backend needed
- Both inference paths speak HTTP/JSON: llama.cpp's OpenAI-compatible
  REST for the local primary, and the `@google/genai` Node SDK for the
  cloud fallback. Same TypeScript client interface for both.

**Why not Python + Next.js with Python backend:**
- Doubles the cognitive surface for anyone reading the repo
- Modal/FastAPI cold starts, API gateway, CORS, two sets of deploys
- No gain over native Next.js for this workload

**What we keep from Python stack patterns:**
- Same orchestration idea (three phases, two personas per Build+Package)
- Same SSE streaming approach
- Same structured output via tool-calling

---

## 3. Data Model — Postgres (Neon) + Prisma

Single database covers:
- Lesson runs (teacher input, orchestration state, final package)
- Source uploads (hashed, not full text, to respect privacy)
- Rate-limit tracking
- Usage stats

### Schema

```prisma
// prisma/schema.prisma

model LessonRun {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  status          RunStatus @default(pending) // pending | building | reviewing | packaging | complete | failed

  // Input
  topic           String
  gradeLevel      String
  classLength     Int?              // minutes
  subject         String?
  objective       String?
  notes           String?           // up to 2KB
  sourceUploadId  String?           // nullable; links to SourceUpload

  // Phase outputs (each is full JSON; queryable for judge inspection)
  hunterBuild     Json?
  christineBuild  Json?
  review          Json?
  hunterPackage   Json?
  christinePackage Json?
  finalPackage    Json?             // the thing teachers download

  // Observability
  timings         Json?             // per-phase latency in ms
  tokenUsage      Json?             // in/out per call
  errorLog        Json?             // if anything broke

  // Privacy
  ipHash          String            // sha256 for rate limiting (not IP itself)
  expiresAt       DateTime          // auto-deleted after 30 days

  @@index([createdAt])
  @@index([expiresAt])
  @@index([ipHash])
}

model SourceUpload {
  id              String   @id @default(uuid())
  uploadedAt      DateTime @default(now())
  filename        String
  contentHash     String   // sha256 of content (used for dedup + audit)
  charCount       Int
  parseMethod     String   // "text" | "pdf_pypdf" | "markdown"
  textContent     String?  // nullable; stored only for TTL window
  expiresAt       DateTime // 1 hour from upload
  ipHash          String

  @@index([expiresAt])
  @@index([ipHash])
}

model RateLimitBucket {
  id              String   @id @default(uuid())
  ipHash          String
  windowStart     DateTime
  requestCount    Int      @default(0)

  @@unique([ipHash, windowStart])
  @@index([windowStart])
}

model UsageStats {
  id              String   @id @default(uuid())
  recordedAt      DateTime @default(now())
  lessonsCreated  Int
  tokensIn        BigInt
  tokensOut       BigInt
  avgLatencyMs    Int
  errorCount      Int

  @@index([recordedAt])
}

enum RunStatus {
  pending
  building
  reviewing
  packaging
  complete
  failed
}
```

### Why Neon (not Supabase / local Postgres / SQLite)

- **Serverless Postgres** — free tier is generous (3 GB, 100 compute
  hours), production-grade, no maintenance
- **Branch per environment** — we can branch the DB for preview
  deploys on Vercel without polluting prod data
- **Fast cold starts** (~500ms) — doesn't fight Vercel's edge rendering
- **Single connection string** — Prisma just works
- **Judge-inspectable** — if a judge asks "where does the lesson go after
  I hit submit," the Prisma schema at `/prisma/schema.prisma` in the
  public repo is the answer

### Privacy Posture

- Source text stored only for 1 hour TTL (teacher uploads → used for
  their lesson → deleted)
- `contentHash` retained longer for dedup/audit but the raw text is gone
- IP addresses never stored; only `sha256(ip + daily_salt)` for rate
  limiting
- Lesson runs expire after 30 days (sharable until then, then pruned)
- A public Privacy page on the site explains this plainly

---

## 4. Gemma 4 Inference — Local llama.cpp (primary) + AI Studio (fallback)

### Why local-first

- **Open-weights model with persona LoRAs** — each request hits a
  specific GGUF + adapter id, both versioned in the repo. Judge mode
  (`?judge=1`) shows the active adapter on every call.
- **No API budget, no per-minute quota** — the orchestration is bounded
  by VRAM and ctx-size, not by Google's input-token rate limit. The
  hackathon build can run an arbitrary number of lessons without
  surprise bills.
- **Privacy** — student/teacher inputs never leave the inference host.
- **Same protocol as the fallback** — llama.cpp serves an OpenAI-style
  `/v1/chat/completions` endpoint with native function-calling, so the
  client wrapper is one code path.

### Serving recipe (`scripts/run_local_llama.sh`)

```text
base = google/gemma-4-e4b-it    (GGUF, Q5_K_M)
--lora <tlc-hunter-lora>        (id 0)
--lora <tlc-christine-lora>     (id 1)
--lora-init-without-apply       (worker hot-swaps per request)
--ctx-size 32768                (Phase 3 prompts can hit 7k tokens)
--gpu-layers 999                (full offload on a 10 GB Arc B570 with
                                 selene-llama@26b stopped — see ops doc)
```

Per-request adapter swap is done by the worker via
`POST /lora-adapters` with `[{id:0, scale:1}, {id:1, scale:0}]` (Hunter
active) or the inverse (Christine active). The persona-aware merge in
`lib/merge.ts` combines the two outputs deterministically.

### Cloud fallback

Stock Gemma 4 31B (dense) via Google AI Studio is wired through the
same client interface (`lib/gemma.ts`). Used if the local backend is
unreachable. `GEMMA_BACKEND=local` (default) + `GEMMA_LOCAL_URL`
selects the local path; absence of those vars falls back to the cloud
path.

### Client Wrapper

```typescript
// lib/gemma-local.ts (primary) + lib/gemma.ts (cloud fallback)
//
// Both export a function with the same signature; the orchestrator
// picks one based on GEMMA_BACKEND.

export async function callGemmaLocal(params: {
  systemPrompt: string;
  userPrompt: string;
  tool: FunctionDeclaration;
  persona?: "hunter" | "christine";   // selects which LoRA to activate
  temperature?: number;               // default 0.5
  maxRetries?: number;                // default 3 — trained model can
                                      //  occasionally emit partial JSON;
                                      //  retries converge to clean output
}): Promise<{ toolArgs, rawText, viaToolCall, tokensIn, tokensOut, latencyMs }>;
```

### Retry + Fallback Policy

- **3 attempts per call** at temperature 0.5 (the trained model's
  occasional partial-JSON emits resolve with one or two re-samples).
- On all attempts failing for a given call: record error to
  `LessonRun.errorLog`, mark the run `failed`, surface a clean message
  to the UI.
- **No silent fallback between backends mid-run.** Either the run
  used local + LoRAs end-to-end, or it used cloud Gemma 4 31B
  end-to-end. The `generated_by` provenance on each phase output
  records which.

---

## 5. Reliability for Judges

**"Judges need to see it"** is the deciding concern. Concrete measures:

### 5.1 No Cold Starts
- Vercel hobby tier keeps functions warm across regions for active
  projects. We ping `/api/health` via an uptime monitor every 60s during
  judging week — keeps functions hot, catches outages immediately.
- Neon: serverless Postgres with ~500ms cold start, but the first page
  load already warms it.

### 5.2 Pre-Generated Examples Always Available
- `/gallery` shows 5-6 pre-generated lesson packages (photosynthesis,
  fractions, water cycle, etc.) served directly from the DB — no Gemma
  call needed
- Even if the inference backend (local llama.cpp *or* cloud AI Studio)
  goes down mid-judging, judges can still experience the output
  quality via the gallery
- Each gallery lesson shows its "generated on" timestamp + the same
  inspector UI as live-generated lessons

### 5.3 Health Dashboard (Public)
- `/api/health` — JSON: `{ status, gemma_reachable, db_reachable,
  last_lesson_at, uptime_pct_24h }`
- `/stats` page renders a simple live chart from `UsageStats`: lessons
  created today, average latency, error rate
- Judges see the system is real, has throughput, is being used

### 5.4 Degraded-Mode UI
- If `gemma_reachable=false`, the create form shows a banner:
  "Live generation is temporarily unavailable — explore the gallery for
  sample lessons," with a clear CTA to the gallery
- Never show a broken spinner or a 500 error to a judge

### 5.5 Rate Limit Design
- 10 lessons/hour per IP is enough for any honest judge flow
- Rate limit UI shows remaining requests + reset time — reads as
  professional, not cheap
- A judge who wants to test more can contact us; we can whitelist their
  IP hash easily

### 5.6 Uptime Monitoring
- Free-tier BetterStack or UptimeRobot pinging `/api/health` every 60s
- If anything goes red, we get a Discord alert within 2 min
- Uptime pct published publicly on `/about`

### 5.7 "I'm a judge" Mode (Optional Polish)
- `/create?judge=1` bypasses rate limits + adds an inspector panel
  showing token counts, phase timings, raw tool-call JSON
- Judges explicitly appreciate being able to see internals

---

## 6. Orchestration — The Three-Phase Flow

### Server-side code path

```typescript
// app/api/lesson/create/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const run = await prisma.lessonRun.create({
    data: { ...validateInput(body), ipHash: hashIp(req) },
  });
  orchestrate(run.id); // fire-and-forget; frontend subscribes to SSE
  return Response.json({ runId: run.id });
}

// app/api/lesson/stream/[id]/route.ts — SSE endpoint
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of subscribeToRun(params.id)) {
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Orchestrator (lib/orchestrator.ts)

```typescript
export async function orchestrate(runId: string) {
  const run = await prisma.lessonRun.findUniqueOrThrow({ where: { id: runId } });
  const source = run.sourceUploadId ? await loadSource(run.sourceUploadId) : null;
  const ctx = buildContext(run, source);

  await setStatus(runId, "building");
  const [hunterBuild, christineBuild] = await Promise.all([
    callPersona("hunter", ctx, SCAFFOLD_TOOL),
    callPersona("christine", ctx, SCAFFOLD_TOOL),
  ]);
  await savePhaseOutput(runId, { hunterBuild, christineBuild });

  await setStatus(runId, "reviewing");
  const review = await callReview(ctx, { hunterBuild, christineBuild }, REVIEW_TOOL);
  await savePhaseOutput(runId, { review });

  await setStatus(runId, "packaging");
  const [hunterPackage, christinePackage] = await Promise.all([
    callPersona("hunter", ctx, PACKAGE_TOOL, { review }),
    callPersona("christine", ctx, PACKAGE_TOOL, { review }),
  ]);
  const finalPackage = mergePackages(hunterPackage, christinePackage);
  await prisma.lessonRun.update({
    where: { id: runId },
    data: {
      status: "complete",
      hunterPackage,
      christinePackage,
      finalPackage,
    },
  });
}
```

### SSE Event Stream

- `phase_start` — `{ phase: "building" | "reviewing" | "packaging" }`
- `hunter_token` / `christine_token` — streaming chunks during Build + Package
- `hunter_complete` / `christine_complete` — full contribution + timing
- `review_complete` — full review JSON + flagged items count
- `package_ready` — final lesson package JSON
- `source_anchor` — emitted when Gemma explicitly anchors a claim in source
- `error` — phase, code, human-readable message

### Merge Strategy (lib/merge.ts)
- Hunter owns: `objective`, `lesson_steps`, `assessment`, `answer_key`,
  `time_blocks`
- Christine owns: `engagement`, `demo`, `teacher_notes`, `discussion_prompts`,
  `differentiation`
- Union of: `materials`, `vocabulary`
- Ties broken by Hunter for structural fields, Christine for pedagogical

---

## 7. Structured Output via Tool Calling

Gemma 4 supports OpenAI-compatible function calling via AI Studio.

```typescript
// lib/tools.ts
export const SCAFFOLD_TOOL: FunctionDeclaration = {
  name: "emit_lesson_scaffold",
  description: "Emit the initial lesson scaffold during the Build phase.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      objective: { type: "string" },
      grade_level: { type: "string" },
      estimated_minutes: { type: "integer" },
      overview: { type: "string" },
      materials: { type: "array", items: { type: "string" } },
      lesson_steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "integer" },
            minutes: { type: "integer" },
            teacher_action: { type: "string" },
            student_action: { type: "string" },
            source_origin: { type: "string", enum: ["grounded", "scaffolded", "generated"] },
          },
          required: ["step", "teacher_action", "source_origin"],
        },
      },
      engagement: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["warm_up", "discussion", "partner", "quick_check", "interactive"] },
          prompt: { type: "string" },
          minutes: { type: "integer" },
        },
        required: ["type", "prompt"],
      },
      demo: {
        type: "object",
        nullable: true,
        properties: {
          description: { type: "string" },
          materials_needed: { type: "array", items: { type: "string" } },
          safety_notes: { type: "string", nullable: true },
        },
      },
      assessment: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["quiz", "exit_ticket", "worksheet", "comprehension_check"] },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                expected_answer: { type: "string" },
                source_origin: { type: "string", enum: ["grounded", "scaffolded", "generated"] },
              },
              required: ["question", "expected_answer"],
            },
          },
        },
        required: ["format", "questions"],
      },
    },
    required: ["title", "objective", "grade_level", "overview",
               "materials", "lesson_steps", "engagement", "assessment"],
  },
};

export const REVIEW_TOOL: FunctionDeclaration = { /* ... */ };
export const PACKAGE_TOOL: FunctionDeclaration = { /* ... */ };
```

### Retry on Parse Failure
- If Gemma's tool-call output fails JSON validation, retry once with
  error context appended: *"Previous output failed validation with: X.
  Re-emit with correct schema."*
- If second retry also fails, log + surface error. Don't fake output.

---

## 8. Source Ingestion Pipeline

```
teacher uploads .pdf/.txt/.md (or pastes text)
  │
  ▼
POST /api/source/upload (multipart)
  │
  ▼
Parse (lib/source_parser.ts):
  .txt/.md → decode as UTF-8
  .pdf     → pdf-parse (Node) → extract text per page, concat
  pasted   → direct
  │
  ▼
Clean: normalize whitespace, strip obvious page headers/footers
  │
  ▼
Truncate to 8 KB with a notice if longer
  │
  ▼
Store in SourceUpload row with 1-hour expiresAt
  │
  ▼
Return { sourceId, excerptPreview, charCount, parseMethod }
```

### Source Origin Labels in Output
- `"grounded"` — content traces directly to teacher's source (cite text span in metadata)
- `"scaffolded"` — source shaped the structure but wording is generated
- `"generated"` — open generation, no source ties
- Labels are emitted per-section by Gemma (required field in every tool call)
- UI renders inline pills; "generated" pills are subtly highlighted so
  teachers know exactly which content to review

### Privacy
- Source text available only during the 1-hour TTL window
- After expiry, only `contentHash` remains for audit/dedup — the raw
  teacher material is gone
- Explicitly documented in `/about#privacy`

---

## 9. Frontend Component Plan

```
app/
├── layout.tsx                   # shell, header, footer
├── page.tsx                     # /
├── create/page.tsx              # main flow
├── lesson/[id]/page.tsx         # shareable view
├── gallery/page.tsx             # pre-generated examples
├── about/page.tsx               # Gemma 4 + persona + privacy story
└── globals.css

components/
├── hero.tsx                     # landing pitch
├── teacher-input-form.tsx       # topic, grade, options, source upload
├── persona-panel.tsx            # the demo money shot — two panels, streaming
│   ├── persona-card.tsx         # Hunter OR Christine card
│   └── streaming-body.tsx       # token-by-token append
├── review-report.tsx            # Phase 2 findings, expandable
├── lesson-package.tsx           # final output with section tabs
│   ├── section-tabs.tsx         # plan / materials / activities / assessment / notes
│   ├── source-note.tsx          # inline pills
│   └── download-buttons.tsx     # md / html / json
├── example-gallery.tsx          # /gallery grid
└── health-badge.tsx             # tiny status indicator in footer

lib/
├── api.ts                       # typed fetchers for /api/*
├── stream.ts                    # EventSource wrapper with reconnection
├── gemma.ts                     # Cloud fallback client (Google AI Studio)
├── gemma-local.ts               # Primary client: local llama.cpp + LoRA hot-swap
├── tools.ts                     # function schemas
├── orchestrator.ts              # three-phase flow
├── personas.ts                  # Hunter + Christine system prompts
├── source_parser.ts             # PDF/MD/TXT parsing
├── merge.ts                     # combine Hunter + Christine outputs
├── prisma.ts                    # Prisma client singleton
└── rate_limit.ts                # per-IP quota check
```

### UI Library
- **shadcn/ui** for the component primitives (unopinionated, ships as
  source code you own, looks good out of the box, Tailwind-native)
- **lucide-react** for icons
- **Inter** font (looks professional, renders cleanly)
- Custom "Hunter" + "Christine" avatar illustrations (SVG; commissioned
  or Midjourney one-shot for ~$0, used in persona-panel.tsx)

---

## 10. Deployment + CI

### Environments
- **prod**: `tlc.teacherlessons.ai` (custom domain — $12) or
  `tlc-demo.vercel.app` (free fallback)
- **preview**: every PR gets an auto-preview URL + its own Neon branch
- **local**: `npm run dev`, local Neon branch, `.env.local` with keys

### Vercel Settings
- Framework: Next.js
- Node runtime for API routes (not Edge — SSE needs Node)
- Keep-warm ping from uptime monitor every 60s
- Environment variables (see [`docs/operations.md`](docs/operations.md)
  for full purpose-by-purpose breakdown):
  - `GEMMA_BACKEND`, `GEMMA_LOCAL_URL`, `GEMMA_LOCAL_MODEL`,
    `GEMMA_LOCAL_PERSONA_LORA`, `WORKER_MODE` — local-first primary
  - `GOOGLE_AI_STUDIO_KEY`, `GEMMA_MODEL_ID` — cloud fallback (optional)
  - `DATABASE_URL` (Neon — Sensitive)
  - `IP_SALT` (for hashed rate limiting)
  - `CRON_SECRET` (for the prune cron)
  - `NEXT_PUBLIC_APP_URL` (for absolute share links)

### GitHub Actions
- On push: typecheck, eslint, prisma generate + validate, `next build`
- On PR: all of the above + preview deploy
- Dependabot for security patches

---

## 11. Observability

- **Logs**: Vercel's built-in log stream (searchable, free for hackathon
  volume)
- **Errors**: Sentry free tier — captures unhandled exceptions with stack
  traces
- **Metrics**: aggregate into `UsageStats` table hourly via a Vercel
  cron function; public read-only `/api/stats`
- **Uptime**: BetterStack free tier pings `/api/health` every 60s
- **Public status page**: hosted at `/status` — shows uptime + recent
  incidents; reads as seriousness to judges

---

## 12. Security

- No auth for MVP (open demo)
- Rate limits: 10 lessons/hour per IP hash, 50/day
- File upload limits: 2 MB file size, 20 pages post-parse for PDFs
- Input validation via Zod schemas on every API route
- Prisma's generated types prevent SQL injection by construction
- CSP headers in `next.config.ts`: deny unsafe-eval, restrict media
  sources
- Google AI Studio key (cloud fallback) in Vercel env vars, never
  client-exposed. Local backend reached via a Cloudflare Tunnel; the
  llama.cpp port never binds to a public interface.
- IP salt rotated daily (so even the hash isn't a persistent identifier
  beyond 24h)

---

## 13. Repo Layout (Revised)

```
/home/sam/tlc/
├── README.md
├── LICENSE                      # MIT
├── SCOPE.md
├── ARCHITECTURE.md              # this file
├── BUILD_PLAN.md
├── DEMO_SCRIPT.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.example
├── .gitignore
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                  # pre-populates /gallery with 6 examples
│
├── app/                         # Next.js 15 app router
│   ├── layout.tsx
│   ├── page.tsx                 # /
│   ├── create/page.tsx          # main flow
│   ├── lesson/[id]/page.tsx     # shareable view
│   ├── gallery/page.tsx         # /gallery
│   ├── about/page.tsx
│   ├── status/page.tsx
│   ├── globals.css
│   └── api/
│       ├── health/route.ts
│       ├── stats/route.ts
│       ├── source/upload/route.ts
│       └── lesson/
│           ├── create/route.ts
│           ├── stream/[id]/route.ts
│           ├── [id]/route.ts
│           └── [id]/download/route.ts
│
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── hero.tsx
│   ├── teacher-input-form.tsx
│   ├── persona-panel.tsx
│   ├── persona-card.tsx
│   ├── streaming-body.tsx
│   ├── review-report.tsx
│   ├── lesson-package.tsx
│   ├── section-tabs.tsx
│   ├── source-note.tsx
│   ├── download-buttons.tsx
│   ├── example-gallery.tsx
│   ├── health-badge.tsx
│   └── footer.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── gemma.ts
│   ├── tools.ts
│   ├── orchestrator.ts
│   ├── personas.ts
│   ├── source_parser.ts
│   ├── merge.ts
│   ├── stream.ts
│   ├── rate_limit.ts
│   └── validators.ts            # Zod schemas
│
├── public/
│   ├── hunter-avatar.svg
│   ├── christine-avatar.svg
│   └── og-image.png
│
├── docs/
│   ├── screenshots/             # media gallery for submission
│   └── video/                   # demo video source
│
├── examples/
│   └── seed_lessons/            # JSON files seed.ts loads into DB
│       ├── photosynthesis_5th.json
│       ├── fractions_3rd.json
│       ├── water_cycle_4th.json
│       ├── civil_rights_middle.json
│       ├── ecosystems_elementary.json
│       └── shakespeare_9th.json
│
├── tests/
│   ├── unit/
│   │   ├── merge.test.ts
│   │   ├── source_parser.test.ts
│   │   └── rate_limit.test.ts
│   └── e2e/
│       └── create_lesson.test.ts
│
└── .github/
    └── workflows/
        ├── ci.yml               # typecheck, lint, test, build
        └── seed.yml             # on deploy to prod, ensure gallery seeded
```

---

## 14. Decisions Summary (v2)

| Layer | Choice (v2) | Why |
|---|---|---|
| Language | **TypeScript end-to-end** | one language, polished repo, judge-friendly |
| Framework | **Next.js 15 App Router** | frontend + API + SSE in one codebase |
| Hosting | **Vercel** (frontend + API) | free, warm, custom domains, auto-deploy |
| Database | **Neon Postgres + Prisma** | serverless, branchable, typed, inspectable |
| AI (primary) | **Local llama.cpp + Gemma 4 E4B + Hunter/Christine LoRAs** | open weights, no API budget, per-persona behavior baked in |
| AI (fallback) | Google AI Studio `gemma-4-31b-it` (dense) | resilience if local backend is unreachable |
| Structured output | **Gemma 4 function calling** | tool-call JSON with retry |
| Streaming | **Server-Sent Events (Node runtime)** | SSE works cleanly on Vercel Node functions |
| Source ingestion | **pdf-parse (Node), 8 KB cap, 1h TTL** | simple, private, good enough for MVP |
| UI library | **shadcn/ui + Tailwind + lucide** | polished, owned-source components |
| Observability | **Vercel logs + Sentry + BetterStack** | all free tiers, full coverage |
| Auth | **None (open demo, rate-limited)** | hackathon scope |
| Privacy | **1h TTL source, 30d TTL lesson, hashed IPs** | honest posture, no user tracking |

---

## 15. What This Buys You (Judge-Facing)

A judge clicking your submission link sees:
- A polished Next.js site, custom domain, professional look
- A working live demo they can actually use (not cold-start 503s)
- A gallery of pre-generated lessons they can browse if they don't want
  to wait for live generation
- A health/status page showing the system is up, metric'd, monitored
- An open repo with a clean TypeScript codebase they can read top-to-bottom
- A Prisma schema that shows exactly how data flows
- Source code that doesn't apologize for being a hackathon

None of this is more work than it has to be — it's the modern default
stack. The 27-day budget accommodates it comfortably.
