# TLC — Teacher's Lesson Creator

**Every Teacher Deserves TLC.**

A Gemma 4-powered lesson-building tool that turns a topic and grade
level into a complete, classroom-ready lesson package — guided by two
collaborating personas, Hunter and Christine.

## Quick Links

- **[Live demo](https://tlc-demo.vercel.app)** *(live after Week 1)*
- **[Demo video](https://youtube.com/)** *(recorded Week 4)*
- **[Scope](SCOPE.md)** — what TLC does and why
- **[Architecture](ARCHITECTURE.md)** — technical stack + data flow
- **[Prompts](PROMPTS.md)** — Hunter + Christine persona design
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

## Project Status

Submission target: Gemma 4 Good Hackathon, Impact Track
Deadline: 2026-05-18

## License

MIT — see [LICENSE](LICENSE).
