# TLC — Teacher's Lesson Creator

**Every Teacher Deserves TLC.**

A Gemma 4-powered lesson-building tool that turns a topic and grade
level into a complete, classroom-ready lesson package — guided by two
collaborating Teacher's Assistants, Hunter and Christine.

## Quick Links

- **[Live demo](https://tlc-demo.vercel.app)** *(live after Week 1)*
- **[Demo video](https://youtube.com/)** *(recorded Week 4)*
- **[Scope](SCOPE.md)** — what TLC does and why
- **[Architecture](ARCHITECTURE.md)** — technical stack + data flow
- **[Prompts directory](prompts/)** — versioned `.md` files for every string sent to Gemma 4 (source of truth)
- **[Prompt design rationale](PROMPTS.md)** — why Hunter and Christine are split this way
- **[Data privacy](DATA_PRIVACY.md)** — what TLC collects, retention windows, why no user data lands in model weights
- **[Schema](SCHEMA.md)** — structured output contract
- **[UI](UI.md)** — screen-by-screen layout spec
- **[Build plan](BUILD_PLAN.md)** — 27-day milestone schedule
- **[Demo script](DEMO_SCRIPT.md)** — 2:30 video walkthrough
- **[Writeup](WRITEUP.md)** — Kaggle submission document

## Running locally

```bash
# 1. Install deps
npm install

# 2. Copy the env template and fill it in
cp .env.example .env.local
# Set GOOGLE_AI_STUDIO_KEY (https://aistudio.google.com/apikey)
# Set DATABASE_URL (Neon connection string with sslmode=require)

# 3. Push the Prisma schema to your Neon database
npx prisma migrate dev --name init

# 4. Seed the gallery with example lessons
npm run db:seed

# 5. Start the dev server
npm run dev
# → http://localhost:3000
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
vercel env add GOOGLE_AI_STUDIO_KEY production
vercel env add DATABASE_URL production
vercel env add IP_SALT production
vercel env add CRON_SECRET production    # openssl rand -hex 32
vercel env add NEXT_PUBLIC_APP_URL production    # https://your-deploy.vercel.app

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
