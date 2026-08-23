# AI-Powered Alumni Career Intelligence System

A full-stack web application connecting students and alumni through structured search,
AI-powered semantic matching, career insights, and a peer-advice system.

Built for a 5-day college project timeline. Stack: **Node.js + Express + EJS**,
**PostgreSQL (Neon)** as the source of truth, **Qdrant** for semantic alumni search,
and **Groq** as the LLM for natural-language query understanding.

---

## 1. Tech Stack

| Layer          | Technology                                   |
|----------------|-----------------------------------------------|
| Frontend       | HTML, CSS, JavaScript, EJS (server-rendered) |
| Backend        | Node.js, Express.js                          |
| Auth           | JWT (access + refresh tokens)                |
| Database       | PostgreSQL (Neon)                            |
| LLM            | Groq API                                     |
| Vector DB      | Qdrant                                       |
| Embeddings     | Local, in-process (see below)                |

---

## 2. Embedding Model (required documentation)

Groq does not provide an embeddings endpoint, and the spec disallows a Python backend,
so embeddings are generated **locally inside the Node.js process** using
[`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) (an ONNX-runtime
port of Hugging Face Transformers that runs in plain JS/Node — no Python required).

- **Model:** `Xenova/all-MiniLM-L6-v2` (JS/ONNX port of `sentence-transformers/all-MiniLM-L6-v2`)
- **Vector dimension:** `384`
- **Distance metric:** Cosine (configured on the Qdrant collection)
- **Why this model:** it runs fully offline after the first download, is small (~90MB) and
  fast on CPU, and keeps the whole stack to Node.js only — avoiding a third external API
  (and its rate limits/downtime) on top of Postgres, Qdrant, and Groq during a live demo.
- **Configuration:** `EMBEDDING_DIMENSION=384` in `.env` must match the Qdrant collection's
  vector size. This is handled automatically in `config/qdrant.js` (`ensureCollection()`),
  which creates the collection with the right size/distance on server start if it doesn't exist.
- **Where it lives:** `services/embedding.service.js`

Model weights are downloaded once from the Hugging Face Hub on first use and cached locally
(under `node_modules/@xenova/transformers/.cache` by default) — no network call is needed on
subsequent runs or during the actual demo.

---

## 3. Project Structure

```
alumni-system/
├── app.js
├── package.json
├── .env.example
├── config/
│   ├── db.js               # PostgreSQL pool
│   └── qdrant.js            # Qdrant client + collection bootstrap
├── middleware/
│   └── auth.js              # JWT auth, role guards
├── routes/
│   ├── auth.routes.js
│   ├── alumni.routes.js
│   ├── student.routes.js
│   ├── ai.routes.js
│   ├── analytics.routes.js
│   └── advice.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── alumni.controller.js
│   ├── student.controller.js
│   ├── ai.controller.js
│   ├── analytics.controller.js
│   └── advice.controller.js
├── services/
│   ├── ai.service.js         # Groq: NL -> structured JSON, match explanations
│   ├── embedding.service.js  # local embedding generation
│   └── qdrant.service.js     # builds semantic doc, upsert/search/delete
├── data/
│   └── survey-questions.js   # the 55-question survey definition
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── generate-seed-hash.js
├── views/                    # EJS templates (see spec section 18)
└── public/
    ├── css/style.css
    └── js/{ai-finder.js, dashboard.js}
```

---

## 4. Setup Instructions

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (or any Postgres instance)
- A [Qdrant](https://qdrant.tech) instance — local via Docker, or Qdrant Cloud
- A [Groq](https://console.groq.com) API key

### Step 1 — Install dependencies
```bash
cd alumni-system
npm install
```

### Step 2 — Configure environment variables
```bash
cp .env.example .env
```
Then edit `.env`:

- `DATABASE_URL` — your Neon connection string (must include `?sslmode=require`)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random strings
- `GROQ_API_KEY` — from https://console.groq.com/keys
- `QDRANT_URL` / `QDRANT_API_KEY` — see below

### Step 3 — Neon PostgreSQL setup
1. Create a free project at https://neon.tech
2. Copy the connection string from the dashboard into `DATABASE_URL`
3. Run the schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
4. (Optional but recommended for a demo) Seed sample data:
   ```bash
   psql "$DATABASE_URL" -f db/seed.sql
   ```
   The seeded users have placeholder password hashes — either regenerate a real
   hash with `node db/generate-seed-hash.js "YourPassword"` and substitute it into
   `db/seed.sql` before seeding, or simply register fresh accounts through the
   `/register` page (recommended — the seed data's purpose is to populate alumni,
   survey, career, and advice records for the Finder/Insights/AI Finder demos).

### Step 4 — Qdrant setup
**Option A — local via Docker (recommended for demos, no network dependency):**
```bash
docker run -p 6333:6333 qdrant/qdrant
```
Leave `QDRANT_API_KEY` blank and set `QDRANT_URL=http://localhost:6333`.

**Option B — Qdrant Cloud:**
Create a free cluster at https://cloud.qdrant.io, then set `QDRANT_URL` to the
cluster URL and `QDRANT_API_KEY` to your API key.

The collection (`alumni_profiles` by default, 384-dim, cosine distance) is created
automatically on server start if it doesn't already exist.

### Step 5 — Groq API setup
1. Sign up at https://console.groq.com
2. Create an API key and put it in `GROQ_API_KEY`
3. `GROQ_MODEL` defaults to `llama-3.3-70b-versatile` — change if needed

### Step 6 — Start the server
```bash
npm start
# or, for auto-reload during development:
npm run dev
```
Visit `http://localhost:3000`.

### Step 7 — Populate Qdrant vectors for seeded alumni
The seed script only writes to PostgreSQL (per spec, Qdrant is never the source of
truth). To generate embeddings for the seeded alumni, either:
- Edit each alumni profile once via the UI (this triggers a resync automatically), or
- Write a one-off script that calls `syncAlumniVector(id)` from
  `services/qdrant.service.js` for each alumni ID (a few lines using the existing
  service — intentionally left out to keep the codebase to what's specified).

---

## 5. Environment Variables Reference

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `DATABASE_URL` | Neon/Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secrets for signing JWTs |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model name |
| `QDRANT_URL` / `QDRANT_API_KEY` | Qdrant connection |
| `QDRANT_COLLECTION` | Qdrant collection name (default `alumni_profiles`) |
| `EMBEDDING_DIMENSION` | Must match the embedding model's output size (384) |

---

## 6. Database Schema Summary

- `users` → `student_profiles` / `alumni_profiles` (1:1 via `user_id`)
- `alumni_profiles` → `alumni_skills` (M:N via `skills`), `alumni_interests` (M:N via `interests`),
  `career_journeys` (1:N), `alumni_survey_responses` (1:N), `alumni_advice` (1:N)
- `student_profiles` → `student_interests` (M:N via `interests`), `advice_questions` (1:N)
- `companies` / `departments` referenced by FK from `alumni_profiles` and `career_journeys`
- `refresh_tokens` stores hashed refresh tokens per user so logout can revoke a specific session

Full DDL in `db/schema.sql`.

---

## 7. API / Route Summary

| Method | Route | Description |
|---|---|---|
| GET/POST | `/auth/login`, `/auth/register/student`, `/auth/register/alumni` | Auth |
| POST | `/auth/refresh`, `/auth/logout` | Token refresh / logout (revokes refresh token) |
| GET | `/` | Home dashboard (role-aware) |
| GET | `/alumni/finder` | Structured alumni search (PostgreSQL) |
| GET | `/alumni/:id` | Alumni profile |
| GET/POST | `/alumni/profile`, `/alumni/profile/edit` | Own alumni profile view/edit |
| GET/POST | `/alumni/survey` | Onboarding survey |
| GET/POST | `/alumni/career` | Career journey timeline |
| GET | `/ai/finder` | AI Finder page |
| POST | `/ai/finder/search` | Groq extraction → Qdrant search → Postgres enrichment |
| GET | `/insights` | Data Intelligence Dashboard |
| GET/POST | `/advice`, `/advice/questions`, `/advice/questions/:id/answers`, `/advice/answers/:id/edit` | Advice system |
| GET/POST | `/student/profile`, `/student/profile/edit` | Student profile |

---

## 8. AI Finder Architecture

1. Student submits free text via `public/js/ai-finder.js` → `POST /ai/finder/search`.
2. `services/ai.service.js` sends the query to **Groq**, which returns structured JSON
   (`interests`, `skills`, `job_roles`, `location`, `graduation_year`, `branch`,
   `experience`, `other_requirements`).
3. `services/qdrant.service.js` embeds the raw query text locally and searches **Qdrant**
   for the top semantically similar alumni (by cosine similarity).
4. The candidate alumni IDs from Qdrant are filtered by any hard structured constraints
   (e.g. `graduation_year`, `branch`) directly against **PostgreSQL**.
5. Full alumni records are fetched from PostgreSQL (never fabricated), a 0–100 match
   score is derived from the vector similarity, and a short "why matched" explanation
   is generated by Groq (with a safe template fallback if Groq is unavailable mid-flow).
6. Results are returned in descending relevance order with score + explanation.

If Groq or Qdrant is unreachable, the endpoint returns a clear JSON error — it never
fabricates alumni or results — and the regular Alumni Finder (pure PostgreSQL) keeps
working independently.

---

## 9. Qdrant Architecture

- One collection (`alumni_profiles`, configurable), one point per alumnus, `id = alumni_id`.
- Payload: `{ "alumni_id": <id> }` — PostgreSQL remains the source of truth for all
  actual profile data; Qdrant only stores the vector + a pointer back to Postgres.
- `services/qdrant.service.js#buildAlumniDocument()` concatenates profile info, skills,
  interests, career journey, survey answers, and advice into one text blob, which is
  embedded and upserted as that alumnus's vector.

## 10. Qdrant Synchronization

Whenever an alumnus's semantically-relevant data changes — profile edit, skills/interests,
career journey add/delete, survey submission, or posting advice — the corresponding
controller calls `syncAlumniVector(alumniId)` (fire-and-forget, logged on failure) which:
1. Re-reads the alumnus's full data from PostgreSQL (already updated in the same request).
2. Rebuilds the consolidated semantic document.
3. Regenerates the embedding.
4. Upserts the Qdrant point — preventing stale vectors, as required.

---

## 11. Known Limitations

- The seed script does not automatically populate Qdrant vectors (Qdrant sync only
  triggers from application actions, per the "PostgreSQL is the source of truth,
  Qdrant is populated from it" design) — see Setup Step 7 to backfill demo vectors.
- Match-explanation generation makes one extra Groq call per result; for very large
  result sets this could be optimized to a single batched call.
- No password-reset flow (out of scope for a 5-day demo).
- No admin UI, though the `users.role` column and schema support an `admin` role for
  future extension, as required.
- Career journey entries can be added and deleted but not edited in-place (delete +
  re-add covers the same need within the project's time budget).
- The AI Finder's structured filters currently apply `graduation_year` and `branch`
  as hard filters on top of semantic candidates; `skills`/`job_roles`/`location`
  extracted by Groq are used to inform the semantic search text but are not further
  hard-filtered, to avoid over-constraining and returning empty results — the match
  score and explanation communicate relevance instead.
