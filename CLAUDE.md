# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Michikan is an AI-powered application tracker and ATS resume-tailoring platform. Resume content is stored as structured JSON (validated by Zod schemas in `packages/shared`) rather than raw documents, so PDF rendering and AI "fit" analysis operate deterministically on the same underlying data.

## Monorepo layout

pnpm workspaces + Turborepo. Workspace globs: `apps/*`, `packages/*`.

- `apps/api` — NestJS backend. Two build targets from one `src/`: the HTTP API (`main.ts` → `AppModule`) and a separate BullMQ worker process (`worker.main.ts` → `WorkerModule`). Both share `src/infra/*` (database, queue, storage, email, logger) and reuse service/processor code from `src/modules/*`.
- `apps/web` — React 19 + Vite + TypeScript frontend (Tailwind v4, shadcn/ui, `@base-ui/react`).
- `apps/static` — separate Astro site (marketing/landing, deployed via Cloudflare Workers/`wrangler`). Independent app, not part of the product SPA. Has its own `AGENTS.md`: start its dev server with `astro dev --background` and manage via `astro dev stop|status|logs`.
- `packages/database` (npm name `db`) — Prisma schema, migrations, and generated client. Exports both a server entry (`server.ts`, full Prisma client) and a browser-safe entry (`browser.ts`).
- `packages/shared` (npm name `shared`) — cross-app Zod schemas, DTOs, and response types shared between `api` and `web`.

`api` and `web` both depend on `db` and `shared` via `workspace:*`.

## Common commands

Run from repo root unless noted; Turborepo fans these out per-package.

```bash
pnpm install                       # install all workspaces
pnpm dev                           # turbo: web + api + worker in dev/watch mode
pnpm build                         # turbo: build all packages/apps (build + build:worker)
pnpm lint                          # turbo: eslint per package
pnpm lint:root                     # eslint on root-level files only
pnpm format / pnpm check:format    # prettier write / check
pnpm check:types                   # turbo: tsc --noEmit per package
pnpm check:cycles                  # turbo: madge circular-dependency check (api, shared)
```

Per-app (use `pnpm --filter <name> <script>`, where `<name>` is the `package.json` name — `api`, `web`, `db`, `shared`, `static`):

```bash
pnpm --filter api dev              # nest start --watch (API server)
pnpm --filter api dev:worker       # nest start --watch worker (BullMQ worker)
pnpm --filter api test             # jest unit tests
pnpm --filter api test -- <name>   # run a single test file/pattern (jest passthrough)
pnpm --filter api test:e2e         # jest e2e (test/jest-e2e.json)
pnpm --filter api prod / prod:worker   # run built dist/ output

pnpm --filter web dev              # vite dev server
pnpm --filter web preview          # serve production build

pnpm --filter db db:generate       # prisma generate (also runs as prebuild)
pnpm --filter db db:migrate        # prisma migrate dev
pnpm --filter db db:deploy         # prisma migrate deploy (prod)
pnpm --filter db db:studio         # prisma studio
```

All `dotenv-run --` prefixed scripts load env vars from the root `.env` (see `.env.example` for required keys: DB, JWT, Valkey, AWS S3/SES, `GEMINI_API_KEY`).

Local infra: `docker compose up -d` brings up Postgres 18 and Valkey (Redis-compatible) for local dev. The same compose file also defines prebuilt `web`/`api`/`workers` service images used in prod deploys (see `scripts/deploy.sh`, `Dockerfile` multi-stage targets `web`/`api`/`workers`).

## Backend architecture (`apps/api`)

- **Two entrypoints, one codebase.** `AppModule` (HTTP) wires `AuthModule`, `UsersModule`, `ResumeModule`, `JobsModule`, `AnalysisModule` behind global `AuthGuard` + `ZodValidationPipe` + `HttpExceptionFilter`. `WorkerModule` only pulls in the BullMQ processors (`AnalyzerModule`, `RenderResumeProcessor`) plus the shared infra modules — no controllers, no HTTP guard stack.
- **Auth guard is global by default.** Every route requires a valid `access_token` cookie unless annotated `@Public()` (see `common/decorators/public.decorator.ts` / `PUBLIC_ACCESS_TAG`). Routes that should work for unverified accounts (e.g. resend-verification) use `@AllowUnverified()`; otherwise an unverified JWT (`req.user.verified === false`) gets a 403.
- **Async work goes through BullMQ/Valkey**, never inline in a request handler: LaTeX resume rendering (`modules/resumes/processors/render-resume.processor.ts`) and Gemini-based job-fit analysis (`modules/analysis/processors`) are queued (`RENDER_QUEUE_NAME`, see `common/constants`) and consumed by the worker process. `infra/queue/bullmq.service.ts` is the enqueue-side helper used from request-handling services.
- **Path aliases** (tsconfig): `@config/*` → `src/config/*`, `@common/*` → `src/common/*`. Don't use relative `../../` chains across these boundaries.
- **Infra modules** (`src/infra/*`) wrap external systems: `database` (Prisma via `PrismaService`), `queue` (BullMQ/Valkey), `storage` (S3), `email` (SES), `logger` (pino via nestjs-pino). Feature modules under `src/modules/*` depend on these, not on the SDKs directly.

## Data model (`packages/database/prisma/schema.prisma`)

Auth is multi-provider: `User` 1–1 `Account` per provider (`GOOGLE` | `GITHUB` | `LOCAL`, composite PK `[provider, userId]`), `hashedPassword` only set for `LOCAL`. `Session` holds a hashed refresh token per `(account, user)` pair plus IP/user-agent, and cascades on `Account`/`User` delete. Email verification is a one-row-per-user `VerifyOtp`.

Core product entities: `Resume` (JSON resume data + async render/analysis status fields), `Job` (application tracked per user, optionally linked to a submitted `Resume`), `JobFitAnalysis` (Gemini-generated fit report tying a `Resume` to a `Job` or standalone description). Long-running generation states use small status enums (`WorkerStatus`, `ReportGenerationStatus`) rather than booleans — check these before assuming a `report`/`json`/`analysisReport` field is populated.

Prisma generates two clients from one schema: CJS (`generated/cjs`, used by `server.ts`) and ESM (`generated/esm`, used by `browser.ts`). Regenerate both with `pnpm --filter db db:generate` after schema changes — it also runs automatically as `prebuild`.

## Frontend architecture (`apps/web`)

- Path alias `@/*` → `src/*`.
- `src/app/` holds route-level views grouped by domain (`resumes/`, `jobs/`, `analysis/`), each typically with `list.tsx`, `detail.tsx`, and `form.tsx`/`new.tsx`. `app.tsx` + `layout.tsx` set up routing/shell; `auth.tsx` and `user.tsx` are top-level auth/account views.
- `src/lib/contexts/` provides app-wide React context (`user`, `sidebar`, `main`) — check here before introducing new global state.
- UI primitives live in `src/components/ui/` (shadcn/ui conventions — `components.json` drives the shadcn CLI).
