# Concept2 Rowing Performance Analytics

AI-powered performance analytics platform for Concept2 rowing workouts. Connects to the Concept2 Online Logbook, ingests per-stroke CSV data, runs Claude AI analysis, and displays rich dashboards with coaching insights.

## Features

- **Concept2 OAuth integration** — Connect your logbook and auto-sync workouts
- **Stroke-level data parsing** — Full CSV ingestion with per-stroke granularity
- **AI coaching analysis** — Claude-powered grading, pacing analysis, technique insights, and training recommendations for every workout
- **Rich dashboards** — Pace/power/SPM charts, score rings, volume trends, personal bests
- **90-day trend reports** — Weekly AI-generated fitness trajectory analysis
- **Background job processing** — BullMQ queues for sync, CSV parsing, and AI analysis
- **Historical import** — Bulk import all workouts from your Concept2 logbook with progress tracking

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts, TanStack Query
- **Backend:** Next.js API routes, Prisma ORM (PostgreSQL), BullMQ (Redis)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Auth:** Custom JWT sessions with Concept2 OAuth 2.0
- **Storage:** S3-compatible object storage for raw CSV files

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Concept2 developer account (register at https://log.concept2.com/developers)
- Anthropic API key
- S3-compatible storage (optional, for CSV backup)

## Setup

1. **Clone and install dependencies:**

```bash
cd concept2-rowing-analytics
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Fill in all values in `.env`:
- `CONCEPT2_CLIENT_ID` / `CONCEPT2_CLIENT_SECRET` — from Concept2 developer portal
- `ANTHROPIC_API_KEY` — from Anthropic console
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY` — generate with `openssl rand -hex 32`
- Storage credentials (if using S3)

3. **Set up the database:**

```bash
npx prisma migrate dev --name init
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Start the background worker** (in a separate terminal):

The BullMQ workers need to be running for sync, CSV parsing, and AI analysis. Create a worker entry point or import `createWorkers()` from `src/lib/jobs/queues.ts`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Backend API endpoints
│   │   ├── auth/           # OAuth flow (Concept2 login/callback/logout)
│   │   ├── workouts/       # CRUD + strokes + analysis + reanalyse
│   │   ├── user/           # Stats, PBs, trends
│   │   └── sync/           # Trigger sync, check status, historical import
│   ├── dashboard/          # Main performance dashboard
│   ├── workouts/           # Workout list and detail pages
│   ├── trends/             # Long-term trend analysis
│   ├── import/             # Import status and controls
│   └── settings/           # Account and connection settings
├── components/
│   ├── charts/             # Recharts-based visualisations
│   ├── layout/             # Navigation and app shell
│   └── ui/                 # shadcn/ui component library
├── lib/
│   ├── ai/                 # Claude AI analysis engine
│   ├── concept2/           # Concept2 API client (OAuth, results, stroke data)
│   ├── csv/                # CSV parser with flexible header detection
│   ├── encryption/         # AES-256-GCM token encryption
│   ├── jobs/               # BullMQ queue definitions and workers
│   ├── auth.ts             # JWT session management
│   ├── prisma.ts           # Prisma client singleton
│   ├── storage.ts          # S3 storage client
│   └── utils.ts            # Formatting helpers and UI utilities
├── types/                  # TypeScript type definitions
└── prisma/
    └── schema.prisma       # Database schema (7 tables)
```

## Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts with encrypted OAuth tokens |
| `workouts` | Workout summaries with derived metrics |
| `stroke_data_points` | Per-stroke granular data |
| `ai_analyses` | Structured AI analysis output per workout |
| `personal_bests` | PB tracking per distance/time category |
| `trend_reports` | Weekly 90-day trend analysis reports |
| `job_failures` | Failed background job logging |

## Background Jobs

| Queue | Schedule | Purpose |
|---|---|---|
| `sync-workouts` | Every 5 minutes | Fetch new workouts from Concept2 |
| `parse-csv` | After workout ingested | Download and parse stroke CSV |
| `analyse-workout` | After CSV parsed | Run Claude AI analysis |
| `historical-import` | Manual trigger | Import all historical workouts |
| `weekly-trend` | Mondays at 06:00 | 90-day trend analysis |

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/auth/concept2` | Initiate OAuth flow |
| GET | `/api/auth/concept2/callback` | OAuth callback |
| GET | `/api/workouts` | List workouts (paginated, filtered) |
| GET | `/api/workouts/:id` | Workout detail with analysis |
| GET | `/api/workouts/:id/strokes` | Full stroke data |
| GET | `/api/workouts/:id/analysis` | AI analysis |
| POST | `/api/workouts/:id/reanalyse` | Re-trigger AI analysis |
| GET | `/api/user/stats` | Aggregate statistics |
| GET | `/api/user/pbs` | Personal bests |
| GET | `/api/user/trends` | Latest trend report |
| POST | `/api/sync/trigger` | Manual sync |
| GET | `/api/sync/status` | Import/sync status |
| POST | `/api/sync/historical` | Full historical import |

## Deployment

Designed for deployment on Vercel (frontend) + Supabase/Railway (database + Redis):

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy database on Supabase or Railway
5. Set up Redis on Upstash or Railway
6. Run `npx prisma migrate deploy` against production database
7. Deploy a worker process for BullMQ (Railway or similar)
