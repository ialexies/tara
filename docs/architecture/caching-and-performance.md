# Caching and performance

Tara serves mobile users in the Philippines — slow networks, small screens. This doc is the implementation guide for the caching strategy decided in [ADR-0008](../adr/0008-caching-strategy.md).

## The rule that never changes

> **Availability and booking state must never be served from cache.**

A stale availability response causes double bookings. Every other resource can trade some freshness for speed. Availability cannot. See [domain/06-concurrency.md](../domain/06-concurrency.md).

---

## Layer 1 — Next.js App Router (RSC + ISR)

### How it works

React Server Components fetch data at request time. Next.js caches `fetch()` responses by default. ISR (Incremental Static Regeneration) serves a cached HTML page and regenerates it in the background after the TTL expires.

### Revalidation targets

| Route                          | Strategy           | Revalidate   |
| ------------------------------ | ------------------ | ------------ |
| `/[locale]` (home)             | ISR                | 3600s (1 hr) |
| `/[locale]/search`             | ISR                | 60s          |
| `/[locale]/properties/[slug]`  | ISR                | 300s (5 min) |
| `/[locale]/login`, `/register` | Static             | —            |
| `/[locale]/dashboard/**`       | Dynamic (no cache) | —            |
| `/[locale]/book/**`            | Dynamic (no cache) | —            |

### Usage in RSC

```ts
// Property detail page — cache for 5 minutes
async function getProperty(slug: string) {
  const res = await fetch(`${process.env.API_URL}/properties/${slug}`, {
    next: { revalidate: 300, tags: [`property:${slug}`] },
  });
  return res.json();
}

// Booking flow — always fresh
async function getAvailability(propertyId: string, dates: DateRange) {
  const res = await fetch(`${process.env.API_URL}/availability`, {
    cache: 'no-store',
  });
  return res.json();
}
```

### On-demand revalidation

When an owner updates their property, call `revalidateTag` from a Server Action or API route:

```ts
import { revalidateTag } from 'next/cache';

// After property update succeeds
revalidateTag(`property:${slug}`);
```

---

## Layer 2 — Redis cache (API layer)

Redis is running at `REDIS_URL` in all environments. Use cache-aside: read Redis → miss → query DB → write Redis → return.

### Cache key conventions

```
property:{id}           → property row + rooms (5 min)
search:{sha256(query)}  → paginated search results (60s)
user:{id}               → user row (15 min)
```

Keys are always prefixed with the resource type. TTLs set with `EX` (seconds).

### Pattern: cache-aside service wrapper

```ts
// apps/api/src/common/cache.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class CacheService {
  private client = createClient({ url: process.env.REDIS_URL });

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
```

### Invalidation on write

```ts
// In PropertyService.update()
await this.db.update(properties).set(data).where(eq(properties.id, id));
await this.cache.del(`property:${id}`);
// Also trigger Next.js ISR revalidation via internal fetch
```

### What NOT to cache in Redis

```ts
// ❌ Never do this
await cache.set(`availability:${propertyId}:${checkIn}:${checkOut}`, result, 300);

// ✅ Availability always reads from DB
const availability = await db.query.holds.findMany({ where: ... });
```

---

## Layer 3 — Cloudflare edge caching

Cloudflare sits in front of all traffic via the Tunnel. Set `Cache-Control` headers for public resources.

### Static assets (Next.js)

Next.js sets these automatically for `/_next/static/*`. Cloudflare respects them. No action needed.

### Property images (R2 via Cloudflare)

Set when uploading to R2 / serving via Cloudflare:

```
Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400
```

Photos don't change often. A 7-day edge cache with 1-day browser cache is safe.

### API responses (public endpoints only)

On NestJS controllers for public, non-personalised endpoints:

```ts
@Get('properties')
@Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
async listProperties() { ... }
```

Never set `Cache-Control: public` on:

- `/auth/*`
- `/bookings/*`
- `/availability/*`
- Any route that reads from the JWT / user session

### Cloudflare Page Rules (set in Cloudflare dashboard)

| URL pattern                     | Cache level      | Edge TTL |
| ------------------------------- | ---------------- | -------- |
| `tara-stays.com/_next/static/*` | Cache Everything | 1 year   |
| `tara-stays.com/images/*`       | Cache Everything | 7 days   |
| `tara-stays.com/api/auth/*`     | Bypass           | —        |
| `tara-stays.com/api/bookings/*` | Bypass           | —        |

---

## Layer 4 — Database indexes

Add indexes in the same migration as the table. Never wait until the table is large.

### Required indexes by feature

| Migration           | Index                                        | Query it serves               |
| ------------------- | -------------------------------------------- | ----------------------------- |
| `0000` (initial)    | `users(email)`                               | Login lookup — already unique |
| `0002` (properties) | `properties(owner_id)`                       | Owner dashboard               |
| `0002` (properties) | `properties(status, created_at DESC)`        | Listing page                  |
| `0003` (bookings)   | `bookings(property_id, check_in, check_out)` | Availability check            |
| `0003` (bookings)   | `bookings(guest_id, created_at DESC)`        | Guest booking history         |
| `0004` (holds)      | `holds(property_id, expires_at)`             | Sweeper + availability        |

### Drizzle index syntax

```ts
// packages/db/src/schema/bookings.ts
export const bookings = pgTable('bookings', { ... }, (t) => ({
  propertyDatesIdx: index('bookings_property_dates_idx')
    .on(t.propertyId, t.checkIn, t.checkOut),
  guestIdx: index('bookings_guest_idx')
    .on(t.guestId, t.createdAt),
}));
```

### Checking query plans (dev)

```bash
pnpm db:psql
# Then:
EXPLAIN ANALYZE SELECT * FROM bookings
  WHERE property_id = '...' AND check_in < '2026-06-01' AND check_out > '2026-05-28';
```

Look for `Index Scan` not `Seq Scan`. If you see `Seq Scan` on a table that will grow large, add an index.

---

## Performance budget (mobile target)

| Metric                  | Target          | Notes                  |
| ----------------------- | --------------- | ---------------------- |
| LCP (property page)     | < 2.5s on 4G    | ISR + edge cache       |
| LCP (search results)    | < 3s on 4G      | ISR 60s                |
| API p95 response        | < 200ms         | Redis hit              |
| API p95 response (cold) | < 500ms         | DB query + index       |
| Time to interactive     | < 4s on slow 3G | RSC, minimal client JS |

These are targets to design toward, not alerts to page on (yet). Measure with Lighthouse and Web Vitals once traffic exists.

---

## What we deliberately don't cache

| Resource                                       | Reason                                                  |
| ---------------------------------------------- | ------------------------------------------------------- |
| Availability (`/availability/*`)               | Correctness — double booking risk                       |
| Hold state                                     | Expires in minutes; must be live                        |
| Payment state                                  | PCI / correctness                                       |
| Auth session (`/auth/me`)                      | Can cache in Redis for 15 min — but never at Cloudflare |
| User-specific prices (if future loyalty/promo) | Personalised — can't share at edge                      |
