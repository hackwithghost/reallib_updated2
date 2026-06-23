# RealLib — Library Seat Attendance Management System

A full-stack system for managing library seat allocations and student attendance via QR codes.

## Local Development (single command)

```bash
# Install dependencies
pnpm install

# Start both backend + frontend together
pnpm dev
```

That's it. This runs:
- **API server** → `http://localhost:8080`
- **Frontend** → `http://localhost:5173/reallib/`

The Vite dev server automatically proxies all `/api` requests to the backend, so you only need to open one URL.

### Environment variables

Create a `.env` file at the repo root (or set them in your shell):

```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
```

### Default admin credentials

```
Username: admin
Password: admin123
```

## Individual commands

```bash
pnpm --filter @workspace/api-server run dev   # backend only (port 8080)
pnpm --filter @workspace/reallib run dev       # frontend only (port 5173)
pnpm --filter @workspace/db run push           # push DB schema changes
pnpm run typecheck                             # typecheck all packages
pnpm run build                                 # typecheck + build everything
```

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node.js 24
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Express 5, Drizzle ORM, Zod validation, JWT auth, bcryptjs
- **Database**: PostgreSQL (Neon / Replit DB)
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/`)

## Where things live

| Path | What |
|------|------|
| `artifacts/reallib/` | React frontend |
| `artifacts/api-server/` | Express backend |
| `lib/db/src/schema/` | Drizzle DB schema (source of truth) |
| `lib/api-spec/` | OpenAPI spec |
| `lib/api-client-react/` | Generated TanStack Query hooks |
| `lib/api-zod/` | Generated Zod validation schemas |

## Architecture decisions

- **Time-based seat allocation**: The browser sends its local `HH:MM` time as a query param (`?localTime=`) so the server picks the right slot without timezone issues (server runs UTC, users are in IST).
- **Auth**: JWT stored in localStorage, attached to requests via `setAuthTokenGetter` from `@workspace/api-client-react`.
- **QR codes**: Generated server-side with the `qrcode` package; embed the full public URL (`/reallib/seat/:id`) as data.
- **`isActive` flag**: Admins control whether an allocation is live; no automatic expiry.

## User preferences

- Keep frontend and backend startable with a single `pnpm dev` from root.
- Default local ports: API=8080, Frontend=5173.
