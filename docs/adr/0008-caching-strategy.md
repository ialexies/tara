# ADR-0008: Caching and performance strategy

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Founder

## Context

Tara is a mobile-first hostel booking marketplace. The majority of users are on mobile networks in the Philippines — bandwidth and latency are constrained. The app must feel fast on a 375px screen over a slow connection.

Two performance profiles exist in the app:

1. **Read-heavy, relatively static** — property listings, property detail pages, search results. These can be cached aggressively.
2. **Write-sensitive, must be fresh** — booking availability, hold state, reservation status. Stale data here causes double bookings. These must never be cached (or only with very short TTLs).

We need a layered caching strategy that maximises performance where it's safe to do so, and explicitly avoids caching where correctness is at stake.

## Decision

Apply caching in four layers, in priority order of implementation:

### Layer 1 — Next.js App Router caching (RSC + ISR)

Property listing and detail pages are React Server Components. Use Next.js `fetch` caching and ISR:

- **Property detail pages** (`/[locale]/properties/[slug]`): `revalidate: 300` (5 min). A property's name, description, photos, and amenities don't change per-request.
- **Search result pages** (`/[locale]/search`): `revalidate: 60` (1 min). Listings change infrequently.
- **Static content** (home, about, locale strings): `revalidate: 3600` or fully static.
- **Auth-gated pages** (dashboard, booking flow): no cache — always dynamic.

This layer costs nothing — it's built into Next.js.

### Layer 2 — Redis application cache (API layer)

Redis is already in the stack. Use it for:

| Cache key pattern       | TTL    | Reason                                                 |
| ----------------------- | ------ | ------------------------------------------------------ |
| `property:{id}`         | 5 min  | Property detail reads dominate; rarely writes          |
| `search:{filters_hash}` | 60s    | Search is expensive; results are eventually consistent |
| `user:{id}`             | 15 min | `/auth/me` on every page load; user data stable        |
| `property:{id}:rooms`   | 2 min  | Room list changes only when owner edits inventory      |

**Never cache:**

- `availability:{propertyId}:{dateRange}` — must be computed from live hold/booking state
- Booking state, payment state, hold expiry — correctness is non-negotiable

Cache-aside pattern: read from Redis → on miss, query DB → write to Redis → return. Invalidate on write.

### Layer 3 — Cloudflare edge caching

Tara is already behind Cloudflare Tunnel. Cloudflare caches by default for static assets. Add explicit Cache-Control headers for:

- `/_next/static/*` — `public, max-age=31536000, immutable` (Next.js hashes these)
- `/images/*` (R2-served property photos) — `public, max-age=86400, s-maxage=604800`
- API responses that are public and safe — set `Cache-Control: public, s-maxage=60` on `/properties` list endpoint

Never set cache headers on authenticated routes or booking endpoints.

### Layer 4 — Database indexes

Before any caching layer, queries must be fast for cache misses (cold cache, first request, cache invalidation). Required indexes:

- `users(email)` — login lookup (already unique, covered)
- `properties(owner_id)` — owner dashboard queries
- `properties(status, created_at)` — listing page with filters
- `bookings(property_id, check_in, check_out)` — availability queries (most critical)
- `bookings(guest_id)` — guest booking history
- `holds(property_id, expires_at)` — sweeper + availability check

Add indexes in the same migration as the table they support. Never add them after data is large.

## Alternatives considered

- **Full-page CDN caching** (cache entire Next.js pages at Cloudflare) — Would require cache-busting on auth state. Rejected for authenticated pages; fine for purely public pages if we ever add a separate public landing.
- **Stale-while-revalidate at the API layer** — More complex to implement correctly than ISR, which handles it natively. Rejected in favour of ISR.
- **Varnish / dedicated cache proxy** — Adds infra complexity on the home server. Rejected; Redis + Cloudflare covers the need.
- **In-memory (Node process) cache** — Doesn't work with multiple API replicas. Rejected.

## Consequences

**Positive**

- Property pages served fast even on slow mobile connections (edge cache → RSC cache → Redis → DB)
- DB load reduced significantly for read-heavy pages
- Cloudflare CDN handles static assets globally at no extra cost
- Availability/booking state always fresh — no double booking risk

**Negative / trade-offs**

- Cache invalidation adds complexity. Each write to a cached resource must also clear its Redis key and optionally trigger ISR revalidation (`revalidatePath`/`revalidateTag`).
- Cold cache (after deploy or restart) means first requests hit the DB. Acceptable for this scale.
- ISR revalidation requires Next.js ISR token in production (or on-demand via API route).

## Implementation order

1. DB indexes — add with each new table migration (no separate task)
2. Next.js ISR on property pages — when property listing feature is built
3. Redis cache-aside on `GET /properties/:id` — when property detail API is built
4. Cloudflare Cache-Control headers — when image pipeline is built (ADR ties to image-pipeline.md)

## References

- [`docs/architecture/caching-and-performance.md`](../architecture/caching-and-performance.md) — implementation guide
- [`docs/domain/06-concurrency.md`](../domain/06-concurrency.md) — why availability must not be cached
- [`docs/architecture/image-pipeline.md`](../architecture/image-pipeline.md) — R2 + Cloudflare image delivery
