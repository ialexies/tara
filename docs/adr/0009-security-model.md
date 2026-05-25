# ADR-0009: Application security model

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Founder

## Context

Tara handles real money (hostel bookings, payments) and personal data (guest PII, owner bank details). Philippine Data Privacy Act (RA 10173) requires security controls and a 72-hour breach notification SLA (Risk Register R-2). We are a two-sided marketplace — guests trust us with their payment data, owners trust us with their payout details.

We need a security model that is:

1. **Proportionate** — not over-engineered for solo dev / early stage
2. **Layered** — defence in depth; no single point of failure
3. **Documented** — so future contributors don't accidentally regress it

## Decision

Apply security in six layers:

### Layer 1 — Authentication (JWT + httpOnly cookies)

- Passwords hashed with bcrypt, cost factor 12
- JWT access token (15 min) + refresh token (30 days) using HS256, audience-separated (`tara:access` / `tara:refresh`)
- Tokens delivered in httpOnly, Secure, SameSite=Lax cookies — inaccessible to JavaScript (XSS cannot steal sessions)
- `JWT_SECRET` minimum 32 bytes, stored in host `.env`, never committed, never logged

### Layer 2 — Input validation (Zod at every boundary)

- All external input (HTTP request bodies, form data, URL params) validated with Zod schemas before reaching business logic
- Schemas live in `packages/schemas` — single source of truth shared between API and web
- Invalid input returns 400 before any DB query is executed
- Drizzle ORM: all queries parameterized — SQL injection not possible

### Layer 3 — Rate limiting (brute-force protection)

- Global: 120 requests/minute per IP
- Auth endpoints (`/auth/register`, `/auth/login`, `/auth/refresh`): 10 requests/minute per IP
- Implemented via `@nestjs/throttler` on the NestJS API
- Returns HTTP 429 when exceeded

### Layer 4 — HTTP security headers

**API (NestJS/Fastify via `@fastify/helmet`):**

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-XSS-Protection: 0` (modern browsers ignore it; CSP is the correct control)
- `Referrer-Policy: no-referrer`
- No CSP — API serves JSON only, not HTML

**Web (Next.js via `next.config.ts` headers):**

- All of the above plus `Content-Security-Policy`
- CSP currently allows `unsafe-inline` / `unsafe-eval` for Next.js App Router compatibility
- Migrate to nonce-based CSP before first real-money users (see consequences)
- `frame-ancestors 'none'` — prevents clickjacking
- `form-action 'self'` — prevents form hijacking

### Layer 5 — CSRF protection

- Server Actions (Next.js 14+): origin header verified automatically by the framework
- REST API: CORS restricted to `WEB_URL` env var only
- SameSite=Lax cookies block cross-site form submissions

No additional CSRF token needed — the combination covers it.

### Layer 6 — Network / infrastructure

- All public traffic via Cloudflare Tunnel: DDoS mitigation, TLS termination at edge
- API not directly reachable from the internet — only accessible via the internal Docker network from the web container, or via Cloudflare
- Request body size capped at 1 MB on the API (`bodyLimit` in Fastify config)
- Staging: separate Docker network, separate database, separate JWT_SECRET from future production

## What we deliberately don't do (yet)

- **Nonce-based CSP** — requires per-request nonce generation and streaming changes. Planned before production.
- **Audit log** — planned for Phase C (before real money). Will log auth events (login, register, token refresh) to a separate table.
- **Secrets rotation** — JWT_SECRET rotation requires a graceful period (old tokens still valid during rollover). Planned when we have ops process.
- **2FA** — not yet. Planned for owner accounts in Phase C.
- **Dependency scanning in CI** — `pnpm audit` to be added to the test job.

## Alternatives considered

- **Session cookies (server-side sessions)** — Redis-backed session store. More stateful, easier to invalidate. Rejected Phase A: JWT is simpler with no Redis dependency for auth. Revisit in Phase C.
- **Refresh token rotation** — Issue new refresh token on each use, invalidate old. More secure but requires Redis to track revoked tokens. Planned Phase C.
- **Separate auth service (Keycloak/Auth0)** — Production-grade but overkill for Phase A. Home-rolled JWT is auditable and has zero ongoing cost.

## Consequences

**Positive**

- XSS cannot steal sessions (httpOnly cookies)
- CSRF not possible (SameSite + origin check)
- SQL injection not possible (Drizzle parameterization)
- Brute-force login significantly harder (rate limiting)
- Clickjacking blocked (frame-ancestors)
- Secrets never in code or logs

**Negative / trade-offs**

- `unsafe-inline` + `unsafe-eval` in CSP weakens XSS protection for scripts. Acceptable for Phase A; **must** tighten before production.
- Rate limiting is per-IP, not per-account. A distributed attack from many IPs is not blocked by this. Cloudflare's bot management handles that tier.
- JWT tokens cannot be invalidated before expiry without a token revocation list (Redis). A stolen access token is valid for up to 15 minutes. Acceptable for Phase A.

## References

- [`docs/architecture/security.md`](../architecture/security.md) — implementation guide and checklist
- [`docs/business/risk-register.md`](../business/risk-register.md) — R-2 (Data Privacy Act), T-5 (supply chain)
- [`docs/domain/06-concurrency.md`](../domain/06-concurrency.md) — booking integrity (separate from auth security)
