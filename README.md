# <img src="./apps/web/public/icon.svg" alt="Logo" width="24" /> Michikan

> This is the repository for **Michikan**, an open-source, AI-powered application tracker and ATS resume tailoring platform built around structured LaTeX data. Read more at [michikan.com](https://www.michikan.com).

---

## Technical Architecture

Michikan treats resume content as **structured data (JSON)** rather than raw formatted documents. PDF generation and AI fit analysis operate on this underlying schema to maintain deterministic rendering and non-destructive AI edits.

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    React    │◄─────►│    NestJS    │◄─────►│   PostgreSQL    │
│  (Vite/TS)  │ REST  │     API      │       │  (via Prisma)   │
└─────────────┘       └──────┬───────┘       └─────────────────┘
                             │
                      ┌──────┴───────┐
                      │    BullMQ    │  → Async queues: LaTeX render tasks,
                      │   (Valkey)   │    Gemini LLM analysis pipelines
                      └──────┬───────┘
                             │
                    ┌────────┴────────┐
                    │   Gemini API    │
                    │  LaTeX Compiler │
                    └─────────────────┘

```

### Core Execution Flow

1. **Schema Integrity:** Resume data is governed by a unified Zod schema (`@michikan/resume-schema`).
2. **Asynchronous Execution:** Heavy workload actions (LaTeX PDF compilation and Gemini prompt evaluation) are offloaded to **BullMQ** workers backed by **Valkey** to keep HTTP response times low and predictable.
3. **Structured AI Mutations:** The Gemini analyzer operates against the JSON payload directly, mapping missing keywords or bullet revisions directly to specific field paths without corrupting formatting guarantees.

---

## Tech Stack

| Layer               | Technology                                       |
| ------------------- | ------------------------------------------------ |
| **Frontend**        | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend**         | NestJS, TypeScript                               |
| **Database**        | PostgreSQL via Prisma ORM                        |
| **Message Queue**   | BullMQ backed by Valkey                          |
| **Validation**      | Zod                                              |
| **AI Integration**  | Gemini API                                       |
| **Document Engine** | LaTeX (Single-column ATS standard)               |
| **Package Manager** | `pnpm` (Turborepo / Monorepo layout)             |

---

## Monorepo Layout

```text
michikan/
├── apps/
│   ├── web/            # React + Vite frontend application
│   └── api/            # NestJS backend service & queue workers
├── packages/
│   ├── resume-schema/  # Shared Zod schemas for resume JSON validation
│   └── latex-templates/# LaTeX templates & compiler binding logic
├── prisma/             # Database schema, migrations, and seeds
└── docker-compose.yml  # Local infrastructure services (Postgres, Valkey)

```

---

## Local Setup & Running Locally

### Prerequisites

- **Node.js** $\ge 20$
- **pnpm** ($\ge 9$)
- **Docker** & **Docker Compose**
- **LaTeX Distribution** (e.g., `texlive-full` or `pdflatex` CLI accessible in environment path)
- **Gemini API Key**

---

### Step 1: Environment & Infrastructure

Clone the repository and install workspace dependencies:

```bash
git clone https://github.com/<your-username>/michikan.git
cd michikan

pnpm install
cp .env.example .env

```

Configure your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/michikan"
VALKEY_URL="redis://localhost:6379"
GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="your-jwt-secret"

```

Spin up local **PostgreSQL** and **Valkey** (Redis-compatible message broker) instances using Docker:

```bash
docker compose up -d

```

Run database migrations:

```bash
pnpm prisma migrate dev

```

---

### Step 2: Build & Production Execution

To build all workspace targets and spin up the backend API, async background worker, and frontend preview server:

#### 1. Build all workspace packages and applications

```bash
pnpm build

```

#### 2. Start the NestJS API Server

```bash
pnpm --filter api prod

```

#### 3. Start the BullMQ Async Worker (LaTeX & AI Job Processing)

```bash
pnpm --filter api prod:worker

```

#### 4. Preview the Frontend Production Build

```bash
pnpm --filter web preview

```

---

## Development Script Reference

| Target               | Command                         | Description                                                  |
| -------------------- | ------------------------------- | ------------------------------------------------------------ |
| **Build Workspace**  | `pnpm build`                    | Compiles all packages and apps within the monorepo           |
| **API Web Server**   | `pnpm --filter api prod`        | Runs the production build of the HTTP API server             |
| **API Queue Worker** | `pnpm --filter api prod:worker` | Runs the BullMQ background worker for processing queued jobs |
| **Web Client**       | `pnpm --filter web preview`     | Serves the production build of the web application locally   |

---

## Acknowledgments

- [r/EngineeringResumes](https://www.reddit.com/r/EngineeringResumes/) — for the resume wiki and template guidance this project is built around.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
