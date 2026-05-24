# Tara

> _Tara, na!_ — "let's go" in Tagalog.

A booking marketplace for Philippine hostels. Launching in Zambales, expanding across SE Asia.

## What this is

A two-sided marketplace:

- **Guests** book hostels, dorms, and tours
- **Property owners** list and manage their inventory
- **Tour operators** list activities that bundle with stays

Built as a custom booking engine — not a thin layer over Cloudbeds or Hostaway. Multi-tenant from day one.

## Repo layout

```
tara/
├── apps/
│   ├── web/         Next.js 15 — public site + admin dashboard
│   ├── api/         NestJS — REST/tRPC API
│   └── jobs/        BullMQ workers
├── packages/
│   ├── schemas/     Zod schemas (source of truth for shapes)
│   ├── types/       Shared TypeScript types
│   ├── db/          Drizzle ORM + migrations
│   ├── money/       Currency, FX, tax math
│   ├── temporal/    Date/time, night calculations, timezones
│   ├── availability/ Pure availability engine
│   ├── pricing/     Pure pricing engine
│   ├── booking/     Booking lifecycle state machine
│   ├── auth/        Session, RBAC, multi-tenant context
│   ├── email/       React Email templates
│   ├── ui/          Shared components (shadcn-based)
│   └── ...
├── docs/
│   ├── adr/         Architecture decision records
│   ├── domain/      Domain modeling docs + glossary
│   ├── infra/       Infra & deployment docs
│   ├── runbooks/    Operations runbooks
│   ├── business/    Business model, personas, strategy
│   └── api/         API reference
└── infra/
    ├── docker-compose.dev.yml
    └── portainer/
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Backend | NestJS (Fastify adapter), modular monolith |
| Bridge | tRPC + shared Zod schemas |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / queue | Redis + BullMQ |
| Storage | Cloudflare R2 |
| Email | Resend + React Email |
| Payments | Stripe |
| Auth | Auth.js |
| Edge | Cloudflare (DNS, WAF, Tunnel) |
| Monorepo | Turborepo + pnpm |

See [`docs/adr/`](docs/adr/) for the reasoning behind each choice.

## Local development

This project is developed on **Windows** and deployed to **Ubuntu**. See [`docs/infra/development-workflow.md`](docs/infra/development-workflow.md) for cross-platform conventions and pitfalls to avoid.

### Prerequisites

- Node.js 20.10+ (`nvm use` to match `.nvmrc`)
- pnpm 9+ (`corepack enable` or install separately)
- Docker Desktop (Windows) or Docker Engine (Linux) — for Postgres, Redis, etc.
- Git with `core.autocrlf=input` (so commits use LF endings)

### Setup

```bash
pnpm install
cp .env.example .env
# Fill in .env values

# Start infrastructure (Postgres, Redis, Mailpit, Adminer)
docker compose -f infra/docker-compose.dev.yml up -d

# Run database migrations (once db package is wired up)
pnpm db:migrate

# Run all apps in dev mode
pnpm dev
```

### Common commands

```bash
pnpm dev              # Run all apps
pnpm build            # Build all apps + packages
pnpm lint             # Lint everything
pnpm typecheck        # Typecheck everything
pnpm test             # Run all unit + integration tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm format           # Format with Prettier
```

## Environments

| Env | Where | Purpose |
| --- | --- | --- |
| `local` | Your Windows dev machine | Development, fast iteration |
| `staging` | Ubuntu home server | Pre-production verification, dogfooding |
| `production` | TBD (Vercel + cloud DB eventually) | Real guests, real money |

## Documentation

- **Decisions**: [`docs/adr/`](docs/adr/) — architecture decision records
- **Domain**: [`docs/domain/`](docs/domain/) — booking domain modeling
- **Infra**: [`docs/infra/`](docs/infra/) — home server + deployment + dev workflow
- **Runbooks**: [`docs/runbooks/`](docs/runbooks/) — operations
- **Business**: [`docs/business/`](docs/business/) — strategy, personas, model

## License

Private. All rights reserved.
