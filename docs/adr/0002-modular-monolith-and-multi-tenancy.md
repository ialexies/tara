# ADR-0002: Modular monolith + multi-tenancy from day 1

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

Tara is a two-sided marketplace: independent property owners each manage their own properties, rooms, prices, bookings, and finances. From day one, owner A's data must be invisible to owner B, even via bugs.

We need to choose:

1. **Service topology** — one deployable, several deployables, or many?
2. **Tenancy model** — how is owner isolation enforced in the data layer?

The team is one person growing to maybe 2-4 over 2-3 years. The volume is small at MVP (~20-50 bookings/month Phase B), with room to grow 100x over 2-3 years before we'd need to seriously rethink architecture.

## Decision

**1. Topology: Modular monolith.** One deployable backend (`apps/api`) containing all business logic, organized into clearly bounded modules:

```
apps/api/src/
├── inventory/       # properties, rooms, beds
├── pricing/         # rate plans, rules
├── booking/         # holds, reservations, lifecycle
├── tours/           # activities, slots
├── auth/            # session, RBAC, multi-tenant context
├── payment/         # Stripe Connect, manual mode
├── channel/         # OTA sync (Phase 3+)
├── notification/    # email, SMS, WhatsApp, push (Phase B+ via n8n bridge)
├── admin/           # superadmin, audit log
└── shared/          # cross-cutting infra (db, logger, errors)
```

Background workers (`apps/jobs`) share the same packages but run independently.

**2. Tenancy model: row-level tenancy enforced at the ORM layer.**

- Every owner-scoped table has a `tenant_id` column (denormalized from `owner.id` for query speed).
- Tenant context is established at the start of every request from the JWT and stored in `AsyncLocalStorage`.
- A `withTenant(query)` wrapper in `packages/db` automatically appends `WHERE tenant_id = $current_tenant` to every relevant query.
- Bypassing the wrapper requires explicit opt-in (`withoutTenant()`) and is restricted to a small allowlist (admin operations, cross-tenant reports).
- A test suite verifies that no module bypasses `withTenant()` without the explicit escape hatch.

## Alternatives considered

### Topology

- **Microservices from day 1** — Passed: huge operational overhead for a solo dev, premature service boundaries before we understand the domain, deployment complexity, inter-service auth complexity. Modular monolith preserves the *option* to extract services later (a properly-bounded module becomes a service in days, not months).
- **Next.js full-stack (no separate API)** — Passed: collapses the architectural boundary that helps a small team scale. Worth revisiting only if we never grow beyond 1-2 devs.
- **Serverless functions** — Passed: cold starts hurt booking UX, self-hosting story doesn't fit, observability is worse.

### Tenancy model

- **Database-per-tenant** — Passed: ops nightmare at scale (hundreds of databases), schema migrations multiplied, no easy cross-tenant analytics, expensive for a marketplace where individual tenants are small (a single hostel).
- **Schema-per-tenant in shared Postgres** — Passed: cleaner isolation than rows, but complex queries across schemas, migration tooling poor, still doesn't scale to thousands of tenants.
- **Row-level security (RLS) in Postgres** — Considered seriously. Strong protection (defense in depth), but: harder to debug, slower for complex queries, application code still needs the tenant filter to use indexes effectively. **May add RLS in Phase C as a defense-in-depth layer on top of the ORM wrapper.**
- **No multi-tenancy, retrofit later** — Strongly rejected. Retrofitting multi-tenancy is one of the worst tech-debt categories. The few extra columns and one wrapper now save us from a months-long migration later.

## Consequences

**Positive**

- One deployment to manage in Phase A-C. Logging, monitoring, deploys all simple.
- Module boundaries can be enforced via lint rules (ESLint `no-restricted-imports`) — modules talk only through their public APIs.
- Tenant isolation is a single point of enforcement: the `withTenant()` wrapper. One place to audit, test, and harden.
- Extracting a module to a separate service later is mechanical (well-defined boundary).

**Negative / trade-offs**

- Discipline required: developers can technically reach across modules. We mitigate with lint rules + code review.
- The whole API redeploys for any change. Acceptable for years; matters at scale.
- A bug in `withTenant()` would be catastrophic — must be locked behind tests + code review + maybe RLS as defense in depth (Phase C).

**Neutral / things to watch**

- If any module becomes a true scaling bottleneck (e.g., availability search at high QPS), extract it to its own service with its own datastore.
- Module count drift: keep this list deliberate. Adding modules carelessly fragments cohesion.

## Implementation notes

```ts
// packages/auth/tenant-context.ts
const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

export const withTenantContext = (tenantId: string, fn: () => Promise<void>) =>
  tenantStorage.run({ tenantId }, fn);

export const getCurrentTenantId = (): string => {
  const store = tenantStorage.getStore();
  if (!store) throw new TenantContextMissingError();
  return store.tenantId;
};
```

```ts
// packages/db/tenant-query.ts
export const withTenant = <T>(query: T): T => {
  const tenantId = getCurrentTenantId();
  return query.where(eq(table.tenantId, tenantId));
};
```

```ts
// usage
const properties = await withTenant(db.select().from(properties));
```

A failing test in `packages/auth/__tests__/tenancy.test.ts` enforces that user A can never read user B's data.

## References

- Conversation transcript 2026-05-24
- [ADR-0001 — Tech stack](0001-tech-stack.md)
- Martin Fowler, [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
