# ADR-0001: Tech stack

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

Tara is a two-sided booking marketplace built by a solo developer with a multi-year horizon and a commercial trajectory (likely small team within 2-3 years if growth justifies it). We need a stack that balances three things, in this order:

1. **Long-term hire-ability** — when we add a second developer, we should not have niched ourselves into a tiny talent pool.
2. **Solo-dev velocity** — fewer languages, fewer paradigm shifts, shared types between frontend and backend.
3. **Domain fit** — the booking domain is read-heavy with bursty contended writes; concurrency control happens at the database (locks, transactions), not the application.

Constraints:
- Self-hosted first (home server, Ubuntu, Portainer), hybrid cloud later
- PH region focus initially (multi-currency, multi-language)
- Multi-tenant marketplace from day 1

## Decision

We will build Tara as a **TypeScript-everywhere stack**:

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Backend | NestJS (modular monolith, Fastify adapter) |
| API bridge | tRPC (or REST + shared Zod schemas) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / queue | Redis + BullMQ |
| Storage | Cloudflare R2 |
| Email | Resend + React Email |
| Payments | Stripe + Stripe Connect (Express) |
| Auth | Auth.js (DIY route — see ADR-0002 for multi-tenancy implications) |
| Monorepo | Turborepo + pnpm |
| Edge | Cloudflare (DNS, WAF, Tunnel, CDN, R2) |
| Observability | Self-hosted Grafana + Prometheus + Loki + Sentry (free tier) |
| Testing | Vitest + Testcontainers + Playwright + k6 |
| CI/CD | GitHub Actions (self-hosted runner on home server) |

## Alternatives considered

- **Go backend + Next.js frontend** — Excellent concurrency primitives, well-proven at booking-scale (Booking.com, Stripe). Passed because: (a) smaller PH talent pool than TS; (b) loses the shared Zod/types win between frontend and backend; (c) the booking concurrency story is solved at the Postgres level (`SELECT FOR UPDATE`, advisory locks), so language concurrency model matters less than commonly assumed.
- **Elixir / Phoenix LiveView** — Most architecturally interesting option for this domain (BEAM concurrency, LiveView for real-time availability UX). Passed because: hireability concern is severe in PH and globally; smaller library ecosystem for travel-industry integrations.
- **Python / FastAPI backend** — Familiar, fast iteration. Passed because: GIL limits true parallelism for transactional workloads; less elegant for high-concurrency booking scenarios than TS or Go.
- **Next.js full-stack (no separate API service)** — Simpler ops for solo dev. Passed because: NestJS gives architectural conventions (DI, modules, decorators) that scale to a team better than collapsing into Next.js Server Actions. The cost (one more service) is small with Turborepo + Docker.
- **Prisma instead of Drizzle** — More mature, more popular. Passed because: Drizzle is lighter, faster, and stays closer to SQL — better for the learning goal and avoids Prisma's known performance issues at scale.

## Consequences

**Positive**

- Single primary language across stack → less context switching, faster iteration
- Shared Zod schemas between frontend and backend → end-to-end type safety, fewer integration bugs
- Large, deep talent pool when hiring becomes relevant
- NestJS module structure scales cleanly to a small team
- Drizzle's SQL-honest approach reinforces the user's goal of learning DB internals

**Negative / trade-offs**

- Node throughput ceiling is lower than Go or Elixir under raw load (mitigated: not the bottleneck at hostel-marketplace scale; DB is the bottleneck)
- Cold starts in serverless environments (mitigated: we're self-hosting, not on serverless until much later)
- TypeScript's runtime-erased types mean some validation must be explicit (Zod) — slight ceremony cost

**Neutral / things to watch**

- The TS ecosystem moves fast (Next.js, React, tRPC churning) — discipline needed to avoid chasing every new release
- If pricing engine ever needs heavy ML or numerical optimization, may extract a Python service later (not a problem today)

## References

- Conversation transcript that led to this decision (2026-05-24)
- [ADR-0002 — Modular monolith + multi-tenancy](0002-modular-monolith-and-multi-tenancy.md)
- [ADR-0003 — Development workflow](0003-development-workflow.md)
