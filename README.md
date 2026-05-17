# TLC — Teacher's Lesson Creator

**Every Teacher Deserves TLC.**

A Gemma 4-powered lesson-building tool that turns a topic and grade
level into a complete, classroom-ready lesson package — guided by two
collaborating Teacher's Assistants, Hunter and Christine.

## Quick Links

- **[Live demo](https://tlc-demo.vercel.app)**
- **Demo video — (https://youtu.be/UYMLUsza3gA)**
- **[Scope](SCOPE.md)** — what TLC does and why
- **[Architecture](ARCHITECTURE.md)** — technical stack + data flow
- **[Prompts directory](prompts/)** — versioned `.md` files for every string sent to Gemma 4 (source of truth)
- **[Prompt design rationale](PROMPTS.md)** — why Hunter and Christine are split this way
- **[Data privacy](DATA_PRIVACY.md)** — what TLC collects, retention windows, why no user data lands in model weights
- **[Training pipeline](training/)** — fine-tune Gemma 4 E4B on cloud-Gemma-4-31B golden outputs to ship a local-first edge build of TLC
- **[Schema](SCHEMA.md)** — structured output contract
- **[UI](UI.md)** — screen-by-screen layout spec
- **[Build plan](BUILD_PLAN.md)** — 27-day milestone schedule
- **[Demo script](DEMO_SCRIPT.md)** — 2:30 video walkthrough
- **[Writeup](WRITEUP.md)** — Kaggle submission document

## Running locally

TLC's primary inference path is **Gemma 4 E4B + per-persona LoRA
adapters** served by llama.cpp. Cloud Gemma 4 31B via Google AI Studio
is supported as a fallback. Configure one or both.

```bash
# 1. Install deps
npm install

# 2. Copy the env template and fill it in
cp .env.example .env.local
# Required for either backend:
#   DATABASE_URL          — Neon connection string with sslmode=require
# Local backend (recommended):
#   GEMMA_BACKEND=local
#   GEMMA_LOCAL_URL       — e.g. http://127.0.0.1:8091 (or a Cloudflare Tunnel host)
#   GEMMA_LOCAL_MODEL     — model alias served by llama.cpp (default: "tlc")
#   GEMMA_LOCAL_PERSONA_LORA — JSON map, e.g. {"hunter":0,"christine":1}
# Cloud fallback:
#   GOOGLE_AI_STUDIO_KEY  — https://aistudio.google.com/apikey

# 3. Push the Prisma schema to your Neon database
npx prisma db push

# 4. Seed the gallery with example lessons
npm run db:seed

# 5. (Local backend) Start llama.cpp with the trained adapters
#    See scripts/run_local_llama.sh — fetches Gemma 4 E4B + Hunter +
#    Christine LoRAs and serves them on 127.0.0.1:8091 with adapter
#    hot-swap.
bash scripts/run_local_llama.sh

# 6. Start the dev server
npm run dev
# → http://localhost:3000

# 7. (Optional) Run the orchestration worker against Neon's pending queue
#    Required when running TLC in WORKER_MODE=1 (the local-first deploy
#    on Vercel uses this — the public site enqueues, the worker drains).
bash scripts/run_local_worker.sh
```

### Smoke tests

- `GET /api/health` — returns `{ gemma_reachable, db_reachable }`. Both
  should be `true` once env vars are set.
- `GET /api/test-gemma?persona=hunter` — runs a one-shot Hunter scaffold
  on "photosynthesis, 5th grade". Verifies the Gemma 4 tool-call loop
  works end-to-end. Returns latency + token counts + parsed JSON.
- `GET /api/test-gemma?persona=christine` — same for Christine.

### Scripts

| Script                | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Turbopack dev server at `http://localhost:3000`      |
| `npm run build`       | `prisma generate` + production build                 |
| `npm run typecheck`   | `tsc --noEmit`                                       |
| `npm run db:migrate`  | Create / apply a Prisma migration                    |
| `npm run db:push`     | Fast schema push for dev (no migration file)         |
| `npm run db:seed`     | Load gallery lessons from `examples/seed_lessons/`   |
| `npm run db:studio`   | Open Prisma Studio to inspect rows                   |

## Deploying to Vercel

```bash
# 1. Install the Vercel CLI if you don't have it
npm i -g vercel

# 2. Link the repo to a Vercel project
vercel link

# 3. Set environment variables (or use the Vercel dashboard)
vercel env add DATABASE_URL production
vercel env add IP_SALT production
vercel env add CRON_SECRET production    # openssl rand -hex 32
vercel env add NEXT_PUBLIC_APP_URL production    # https://your-deploy.vercel.app

# Local-first backend (recommended):
vercel env add GEMMA_BACKEND production            # "local"
vercel env add GEMMA_LOCAL_URL production          # Cloudflare Tunnel host pointing at llama.cpp
vercel env add GEMMA_LOCAL_MODEL production        # "tlc"
vercel env add GEMMA_LOCAL_PERSONA_LORA production # {"hunter":0,"christine":1}
vercel env add WORKER_MODE production              # "1" — Vercel only enqueues; the worker on
                                                   #  the inference host drains the pending queue

# Cloud fallback (optional — used if the local backend is unreachable):
vercel env add GOOGLE_AI_STUDIO_KEY production

# 4. Deploy
vercel deploy --prod
```

### Post-deploy checklist

- Hit `https://<deploy>/api/health` — both `gemma_reachable` and `db_reachable` should be `true`.
- Hit `https://<deploy>/api/test-gemma?persona=hunter` — should return a valid scaffold inside ~75s.
- Confirm `/gallery` shows the 6 seeded lessons. If not, run `npm run db:seed` against the production `DATABASE_URL`.
- Set up an uptime monitor pinging `/api/health` every 60s during judging week so functions stay warm and outages are flagged.

### Function durations (configured in `vercel.json`)

| Route | Max duration | Why |
|---|---|---|
| `/api/lesson/create` | 300s | Runs the full 3-phase orchestrator (Build → Review → Package). End-to-end ~200s on dense Gemma 4. |
| `/api/lesson/stream/[id]` | 300s | SSE connection held open while the orchestrator runs. |
| `/api/test-gemma` | 120s | Single-persona smoke test. |
| Everything else | 10–30s | Fast read paths. |

**Vercel Pro is required** during judging — Hobby tier caps functions at 60s and `/api/lesson/create` exceeds that.

### Daily prune

`vercel.json` registers a cron at `/api/cron/prune` that runs at 04:00 UTC and deletes:

- `LessonRun` rows past `expiresAt` (30 days), excluding gallery seeds
- `SourceUpload` rows past `expiresAt` (1 hour)
- `RateLimitBucket` rows older than 24 hours

Authenticated by `CRON_SECRET`. Vercel automatically attaches the secret to cron invocations.

## Project Status

Submission target: Gemma 4 Good Hackathon, Impact Track
Deadline: 2026-05-18

## License

MIT — see [LICENSE](LICENSE).
