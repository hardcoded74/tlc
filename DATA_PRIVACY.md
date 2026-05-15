# Data privacy

This document describes what TLC does and does not collect, how long
each piece of data lives, and the design choices that keep teacher
and student data out of model weights.

It is meant to be specific enough that a hackathon judge or a school
district reviewer can verify each claim against the code.

---

## What TLC asks for

The lesson form (`/create`) collects only what is needed to plan a
lesson. None of the inputs are about specific students.

| Field                  | Required?      | Stored?         |
|------------------------|----------------|-----------------|
| Topic                  | yes            | yes (LessonRun) |
| Grade level            | yes            | yes             |
| Class length (minutes) | optional       | yes             |
| Subject area           | optional       | yes             |
| Learning objective     | optional       | yes             |
| Teaching notes         | optional       | yes             |
| Source material        | optional       | yes (1 hour)    |
| Pseudonymous handle    | auto-assigned  | yes (cookie + LessonRun.authorHandle) |
| Testimonial name/quote | optional       | yes (LessonRun) |
| "Found this useful"    | optional       | yes (Reaction, dedupe by ipHash) |

There is no field for student name, ID, demographic, IEP detail, or
any other personally identifiable information about a learner. The
form is structured for *lesson* planning; student-specific data has
no place in it.

---

## What TLC does **not** ask for or store

- **No student PII.** No names, emails, IDs, photos, or grades.
- **No teacher accounts.** No sign-up, no login, no email collection.
- **No raw IP addresses.** The IP of the requester is hashed before
  it ever touches the database (see "IP hashing" below).
- **No tracking pixels, no third-party analytics.** The page is
  Vercel + Next.js + a Postgres connection — no Google Analytics, no
  Mixpanel, no behavioral fingerprinting.

---

## Retention windows

| Data                            | Retention                                  |
|---------------------------------|--------------------------------------------|
| Lesson runs (`LessonRun`)       | 30 days, then auto-pruned by daily cron    |
| Uploaded source text            | 1 hour, then deleted                       |
| Rate-limit buckets              | 24 hours per window                        |
| Reactions (`Reaction`)          | tied to parent LessonRun (cascades on prune) |
| Handle cookie (`tlc_handle`)    | 1 year (browser-controlled, user-clearable) |

The cron job at `/api/cron/prune` runs daily at 04:00 UTC and deletes
any row past its `expiresAt`. A `CRON_SECRET` Bearer token gates the
endpoint so only Vercel's scheduler can trigger it.

The 1-hour source-text retention is intentional: pasted source
material may be excerpts of copyrighted curricula, third-party
articles, or district documents. It lives only long enough for the
orchestrator to consume it during the run.

---

## IP hashing — exactly how it works

When the API needs to attribute a request (rate limiting, audit), it
hashes the IP through this function (`lib/ip.ts:28`):

```ts
export function hashIp(ipOrReq: string | Request): string {
  const ip = typeof ipOrReq === "string" ? ipOrReq : extractIp(ipOrReq);
  const h = createHash("sha256");
  h.update(`${env.ipSalt}:${todaySaltKey()}:${ip}`);
  return h.digest("hex");
}
```

Three properties matter:

1. **One-way.** SHA-256 is not reversible. The raw IP is never
   stored, never logged, and is unrecoverable from the hash.
2. **Daily salt rotation.** `todaySaltKey()` returns the current UTC
   date, so the same IP produces a different hash every day. A hash
   from yesterday cannot be linked to a hash from today without
   already knowing the IP.
3. **Server salt.** `IP_SALT` is a 32-byte random secret stored only
   in the production environment. Without it, even a brute-force
   pre-image attempt against the daily-rotated hash is infeasible.

---

## Pseudonymous handles

On first visit, TLC's middleware (`middleware.ts`) issues a signed
cookie containing a generated handle like `BraveOtter42` — adjective
+ animal + two digits, drawn from a fixed word list in
`lib/handle.ts`. The cookie value is HMAC-signed with `IP_SALT` so it
can't be forged client-side, then persisted for one year with
`SameSite=Lax`.

Three properties:

1. **No PII.** A handle is generated server-side from a closed
   vocabulary; it isn't derived from the IP, the timestamp, or any
   user input. Two browsers may collide on the same handle and
   nothing breaks — handles aren't identities.
2. **Per-browser.** The cookie is browser-scoped, not device-scoped
   or account-scoped. Clearing cookies (or using a private window)
   yields a new handle on the next request.
3. **User-clearable.** The demo-mode banner has a "new handle" link
   that clears the cookie and re-issues. Past lessons keep crediting
   the previous handle (the field is denormalized at create time on
   purpose).

The handle is used in two places:

- **Testimonial form prefill** — the name input on a completed
  lesson defaults to the viewer's current handle. Override with a
  real name if you want to.
- **Remix attribution** — when you remix a gallery lesson, the new
  `LessonRun.authorHandle` records your handle, which renders as
  "Created by BraveOtter42" on the lesson page and on the parent
  lesson's "Remixes of this lesson" footer.

The handle is **not** sent to Gemma 4, **not** logged for analytics,
and **not** linked to your `ipHash` in the database.

---

## TLC and the model: the data flow that **does not** happen

Gemma 4 inference is **stateless from the user's perspective.** Each
request is one round-trip to either the local llama.cpp instance
(primary) or Google AI Studio (cloud fallback):

```
TLC worker  →  local llama.cpp (Gemma 4 E4B + LoRA)  →  response
              ─OR (fallback)─
TLC server  →  generativelanguage.googleapis.com  →  Gemma 4 response
```

There is **no online fine-tuning loop** in the deployed system. TLC
does not:

- Train, fine-tune, LoRA-adapt, or otherwise modify Gemma 4 *at
  request time*. The Hunter and Christine LoRAs are static, trained
  offline from synthetic data, and shipped as immutable artifacts.
- Store conversation history beyond the single lesson run.
- Send any user data to a third-party model trainer.
- Embed user data into long-term memory or a vector store.

This means **no teacher input and no source material ever lands in
model weights.** Every lesson generation pass sees the same frozen
adapter checkpoints. There is no mechanism in the deployed system by
which one teacher's lesson could leak into another teacher's lesson.

**Local-first matters here.** When the primary backend is in use, no
teacher input crosses the public internet at all — Vercel hands the
run id to a worker over the (private) Cloudflare Tunnel, the worker
generates against `127.0.0.1:8091`, and the result is written back to
Neon. Cloud Gemma 4 traffic only happens when the cloud fallback is
explicitly configured and the local backend is unreachable.

(When the cloud fallback fires, Google's own AI Studio terms govern
what they do with the API traffic on their side. TLC does not retain
a copy of the request
beyond what's needed to render the page and then prune at 30 days.)

---

## External-source verification

Phase 2 of the lesson run cross-references vocabulary terms and
misconception corrections against:

- **Wikipedia** REST API (`en.wikipedia.org/api/rest_v1`)
- **Wikidata** `wbsearchentities` endpoint

These are public read-only APIs that take a single search term and
return a public encyclopedia summary or structured fact. **No user
PII or lesson context is sent to either service** — only the
vocabulary term itself ("photosynthesis", "waxing"). The User-Agent
identifies the app per Wikipedia's API etiquette guidelines.

Standards-code validation is **fully local** — regex against the
documented format for NGSS and Common Core. No network call.

---

## Inspectability

Every prompt sent to Gemma 4 is in the public repository under
[`prompts/`](./prompts/). They are versioned with semver headers so
that anyone reviewing TLC's behavior can see exactly what
instructions the model received and how those instructions have
evolved.

Every section of every generated lesson is attributed in the UI
(Hunter, Christine, or Both) and in the downloaded JSON via the
`generated_by` block. Source-grounded claims are flagged separately
from generated claims via the `source_origin` field on each section.

---

## Summary for school-district review

- No PII collected.
- No accounts, no profiles, no cross-device tracking. Each browser
  gets a non-identifying handle (`BraveOtter42`) that is user-clearable
  and never linked to its `ipHash`.
- Lesson runs auto-prune at 30 days; uploaded sources at 1 hour.
- IPs are hashed daily with a server-side salt; no raw IP is ever
  stored.
- The model is hosted, stateless, and not fine-tuned on user data.
- Verification calls go to public encyclopedia APIs with no user
  context attached.
- All prompts, schemas, and orchestration logic are public, MIT-
  licensed, and inspectable.

If you find a privacy issue, please open a GitHub issue at
<https://github.com/hardcoded74/tlc/issues> — security-relevant
reports get prioritized.
