# <img src="./apps/web/public/icon.svg" alt="Logo" width="24" /> Michikan

**Follow your path; land your role.**

Michikan bundles the entire job-search workflow — building an ATS-friendly resume, tailoring it to a specific job description, and tracking every application — into one coherent tool, so you stop juggling LaTeX, LLM chat tabs, and a spreadsheet you'll abandon in a week.

---

## Why Michikan exists

If you've searched for a job as a software engineer recently, you've probably lived this loop:

1. Find a posting → copy the JD
2. Paste it into an LLM chat, alongside your resume, and ask for feedback
3. Manually reconcile the AI's suggestions into your LaTeX resume on Overleaf
4. Re-export a PDF, apply, and move on — with no record of what you just did

It works, technically. It also falls apart the moment you're not at your laptop, and it leaves your application history living nowhere. Michikan exists to close that loop:

- **Resumes are structured data, not documents.** Store resume content as JSON. Rendering to PDF is just substituting that JSON into a LaTeX template — so an LLM can propose edits to *data* instead of rewriting a wall of text and hoping the formatting survives.
- **Your resume goes wherever you go.** Edit content and download a clean, ATS-friendly PDF from your phone. No LaTeX editor required outside the browser.
- **Analysis and action live in the same place.** The AI analyzer doesn't just talk *at* you — its suggestions map directly onto your resume's JSON fields, so acting on feedback doesn't mean losing the formatting guarantees LaTeX gives you.
- **Tracking is a side effect, not a chore.** Applying through Michikan (downloading a tailored resume for a job) creates the tracking entry automatically, instead of asking you to remember to log it separately.

Michikan is intentionally opinionated: resume structure and content guidance follow the [r/EngineeringResumes wiki](https://www.reddit.com/r/EngineeringResumes/wiki/), and templates are single-column, ATS-friendly LaTeX — the format most consistently recommended for technical roles.

---

## Features

### 1. ATS-friendly resume builder
A guided UI for building resume content, backed by the r/EngineeringResumes wiki's guidance at each field (what makes a strong bullet, how to quantify impact, what to avoid). Content is stored as structured JSON and rendered into the community-recommended single-column LaTeX template. Maintain multiple resumes, edit from any device, and export polished PDFs on demand.

### 2. Job tracker
Save job postings and track them through your application pipeline — from saved, to applied, to interviewing, to offer/rejected. Built to stay out of your way: entries are created automatically as you apply through Michikan, so tracking doesn't require a separate habit.

### 3. Job fit analyzer
Paste a one-off job description, or point to a saved job, and validate it against one of your saved resumes. Analysis is grounded in r/EngineeringResumes guidelines and powered by Gemini behind the scenes — surfacing concrete, actionable gaps (missing keywords, weak or unquantified bullets, formatting concerns) mapped to specific resume fields, rather than generic advice you have to translate yourself.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Background jobs | BullMQ (Valkey) |
| Validation | Zod |
| AI | Gemini API |
| Resume rendering | LaTeX (r/EngineeringResumes-recommended template) |

---

## Architecture at a glance

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   React     │◄────►│   NestJS     │◄────►│   PostgreSQL     │
│  (Vite/TS)  │ REST │   API        │      │   (via Prisma)   │
└─────────────┘      └──────┬───────┘      └─────────────────┘
                             │
                     ┌───────┴───────┐
                     │   BullMQ      │  → async: LaTeX render jobs,
                     │  (Valkey)     │     Gemini analysis calls
                     └───────┬───────┘
                             │
                    ┌────────┴────────┐
                    │  Gemini API     │
                    │  LaTeX compiler │
                    └─────────────────┘
```

Resume content is the single source of truth as JSON. PDF generation is a queued job: JSON → template substitution → LaTeX compile → PDF. AI analysis reads the same JSON schema, so its suggestions can be applied back into resume fields without touching the template or losing formatting guarantees.

---

## Getting started

> **Note:** Michikan is still pre-release — a self-hostable Docker image is in progress (see [Self-hosting with Docker](#self-hosting-with-docker) below). Until then, use the local development setup.

### Prerequisites

- Node.js ≥ 20
- Docker (used to run Postgres and Valkey locally — no need to install either natively)
- A LaTeX distribution (e.g. `texlive-full`) or access to a LaTeX compilation service, for PDF rendering
- A Gemini API key

### Setup

```bash
# Clone the repo
git clone https://github.com/<your-username>/michikan.git
cd michikan

# Install dependencies (frontend + backend)
npm install

# Copy environment variables
cp .env.example .env
```

Fill in `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/michikan"
VALKEY_URL="redis://localhost:6379"
GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="your-jwt-secret"
```

Start Postgres and Valkey with Docker Compose:

```bash
docker compose up -d
```

Then run the app:

```bash
# Run database migrations
npx prisma migrate dev

# Start the backend
npm run dev:api

# Start the frontend
npm run dev:web
```

The app should now be running at `http://localhost:5173`, with the API at `http://localhost:3000`.

---

## Self-hosting with Docker

**🚧 Work in progress.** The goal is a single Docker setup that lets anyone deploy their own instance of Michikan on a local machine or server with minimal steps. Planned flow:

```bash
git clone https://github.com/<your-username>/michikan.git
cd michikan
cp .env.example .env   # add your Gemini API key
docker compose up -d
```

Bringing up the full stack — frontend, backend, Postgres, Valkey — in containers, with your own Gemini API key as the only required secret. This section will be filled in with real instructions once the release image is ready.

---

## Project structure

```
michikan/
├── apps/
│   ├── web/            # React + Vite frontend
│   └── api/            # NestJS backend
├── packages/
│   ├── resume-schema/  # Shared Zod schemas for resume JSON
│   └── latex-templates/# LaTeX template(s) + rendering logic
├── prisma/
│   └── schema.prisma
└── README.md
```

*(Adjust to match your actual repo layout — this reflects a typical monorepo split; update if you're not using one.)*

---

## Roadmap

- [x] Resume builder UI with wiki-guided field hints
- [x] JSON → LaTeX → PDF render pipeline
- [x] Job tracker with pipeline stages
- [x] Gemini-powered job fit analyzer & resume analysis
- [ ] Mobile-first resume editing flow

---

## Contributing

Michikan is early and opinionated by design — issues, discussion, and PRs are welcome, especially around resume schema design, LaTeX template improvements, and analyzer prompt quality. Please open an issue before submitting large changes so we can align on direction first.

---

## Acknowledgments

- [r/EngineeringResumes](https://www.reddit.com/r/EngineeringResumes/) — for the resume wiki and template guidance this project is built around.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
