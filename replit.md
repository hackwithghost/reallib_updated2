# RealLib — Library Seat Attendance Management System

A full-stack web app for managing library seat allocations, student attendance, and fee payments.

## Run & Operate

- `pnpm --filter @workspace/reallib run dev` — run the combined server (Express API + Vite HMR) on port 23952
- `pnpm --filter @workspace/reallib run seed` — seed DB with default admin (username: `admin`, password: `admin123`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Full-stack: Express 5 + Vite (served together via `server/dev.ts`)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts + wouter

## Where things live

- `artifacts/reallib/` — the entire app (server + frontend in one package)
- `artifacts/reallib/server/` — Express API server (routes, middleware, seed)
- `artifacts/reallib/server/dev.ts` — dev entrypoint (Express + Vite middleware)
- `artifacts/reallib/src/` — React frontend (pages, components, hooks)
- `lib/db/src/schema/` — Drizzle schema (admins, students, seats, allocations, attendance)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- **Single combined server**: Express serves both the API (`/api/reallib/...`) and the Vite dev middleware (`/reallib/`) from one process — no separate API server artifact.
- **JWT auth**: Stateless token auth; `SESSION_SECRET` is used as JWT signing secret.
- **isPaid / unpaidSince** fields on students track payment status; overdue = 30+ days unpaid.
- **Absent students** endpoint compares today's allocated students against attendance logs for a given date.

## Product

- Admin login portal with JWT authentication
- Dashboard: stats cards, daily/weekly attendance charts, unpaid fees section (30+ day overdue alerts), absent students section with date picker
- Students: list, create, edit, delete, paid/unpaid toggle
- Seats: list, create, delete, QR code generation
- Allocations: assign students to seats with time slots
- Attendance: mark/view attendance logs, reports

## User preferences

- All server logic lives inside `artifacts/reallib/` — no separate api-server artifact.

## Gotchas

- After any schema change run `pnpm --filter @workspace/db run push` then restart the workflow.
- After any OpenAPI spec change run `pnpm --filter @workspace/api-spec run codegen`.
- The dev server reads `PORT` from env (set to 23952 by the workflow).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
