# TLC operations notes

Production checklist + runbook for the live deployment at
`tlc-hardcoded74s-projects.vercel.app`. Living document.

---

## BetterStack monitor (30 seconds to set up)

The `/api/health` endpoint returns JSON with three fields TLC actually
relies on:

```json
{
  "status": "ok",
  "gemma_reachable": true,
  "db_reachable": true,
  "last_lesson_at": "2026-05-08T01:33:53.794Z",
  "uptime_pct_24h": null
}
```

Setup:

1. Log in to <https://betterstack.com/users/sign-up> (free tier covers
   1 monitor at 3-minute frequency, plenty for this).
2. Go to **Uptime → Monitors → Create monitor**.
3. Configure:
   - **URL:** `https://tlc-hardcoded74s-projects.vercel.app/api/health`
   - **Monitor type:** *Expect a JSON response*
   - **Required fields:** `status` equals `"ok"`, `gemma_reachable` equals
     `true`, `db_reachable` equals `true`
   - **Check frequency:** 3 minutes (free tier max)
   - **Check from:** any single region — pick the one closest to `iad1`
     (US East) since that's the Vercel region in `vercel.json`
   - **Recovery threshold:** 1 successful check (default)
   - **Alert threshold:** 2 consecutive failures
4. Add **email alert** to your address. Skip Slack/PagerDuty unless you
   want them.
5. Save.

You should see the first green tick within 3 minutes. The monitor will
alert if Gemma stops responding (rate-limit storm, AI Studio outage) or
if the Neon Postgres connection breaks.

---

## Vercel: project basics

- **Project:** `hardcoded74s-projects/tlc`
- **Production URL alias:** `tlc-hardcoded74s-projects.vercel.app`
- **Region:** `iad1` (US East)
- **Function timeouts** (set in `vercel.json`):
  - `lesson/create`, `lesson/stream/[id]` — 300s, 1024MB (the orchestrator
    runs here; 5–7 sequential Gemma calls have to fit)
  - `lesson/[id]`, `lesson/[id]/download`, `source/upload` — 30s, 512MB
  - `health` — 10s, 256MB
- **Cron:** `0 4 * * *` daily prune via `/api/cron/prune`. Auth header is
  `Bearer ${CRON_SECRET}`.
- **GitHub auto-deploy:** not currently wired (the initial `vercel link`
  failed to connect the repo). To enable: dashboard → **Settings → Git →
  Connect Git Repository** → point at `hardcoded74/tlc`. Until then,
  redeploys are manual via `npx vercel deploy --prod --yes` from the repo
  root.

---

## Required env vars on Vercel (production)

| Var | Purpose |
|---|---|
| `GOOGLE_AI_STUDIO_KEY` | Gemma 4 calls via `@google/genai`. Billing must be enabled on the linked Google Cloud project for the paid lane. |
| `DATABASE_URL` | Neon Postgres connection string with `?sslmode=require`. |
| `IP_SALT` | 32-byte random salt for hashing IPs. Was `tlc-dev-...` until 2026-05-08; rotated to a fresh `openssl rand -hex 32` value at that time. |
| `GEMMA_MODEL_ID` | `gemma-4-31b-it` for production quality. Switch to `gemma-4-26b-a4b-it` for a faster MoE build if needed. |
| `NEXT_PUBLIC_APP_URL` | `https://tlc-hardcoded74s-projects.vercel.app` (used for absolute share links). |
| `CRON_SECRET` | Random 32-byte hex; matches the `Authorization: Bearer …` header Vercel sends to the cron route. Stored in `/tmp/.vercel-cron-secret` on Sam's laptop. |

Pull the current values for local dev with:

```bash
npx vercel env pull .env.local --environment production --yes
```

---

## Known soft limits / gotchas

- **AI Studio paid lane** is the difference between healthy 60–180s runs
  and 15-minute stalls. The free lane will exceed Vercel's 300s function
  cap on a chain of 5 dense-31B calls. If a deployment ever starts timing
  out, first thing to check: is the API key's GCP project still on
  paid billing?
- **The Neon DB is shared between dev and prod** (one instance). When
  re-seeding via `npm run db:seed` from local, expect prod gallery rows
  to update too.
- **Function cold starts** add ~1–2s on the first lesson after idle.
  Doesn't affect filming since the user clicks `Generate` and then waits
  through the full pipeline anyway.

---

## Re-seeding the gallery

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//; s/^"//; s/"$//') \
  npm run db:seed
```

The seeder is idempotent — each filename in `examples/seed_lessons/`
maps to a deterministic UUID, so re-running updates in place rather
than duplicating.

The **manufactured-contradiction demo seed** is `moon_phases_5th.json`,
mapped to lesson id `0d73cbf9-d7f5-5296-a756-4536c973c865`. Its
`$gallery_meta.review` block is what surfaces the verifier-caught
contradiction in the UI.

---

## Rollback

If a deploy breaks production:

```bash
# List recent deployments
npx vercel ls

# Promote a specific (older, healthy) deployment to prod
npx vercel promote <deployment-url>
```

The previous Vercel deployment URL is always preserved as a unique alias
(e.g. `tlc-7ght8gxds-…`), so promotion is reversible.
