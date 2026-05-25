# Security

Implementation guide for the security model in [ADR-0009](../adr/0009-security-model.md). Use this as a checklist when adding new features.

---

## The non-negotiables

These must be true at all times. Raise a PR comment if you see any of these violated:

1. **Never log secrets** — no `JWT_SECRET`, passwords, tokens, or PII in logs
2. **Never commit secrets** — `.env` is gitignored; staging secrets live on the host server only
3. **Never trust client input** — every HTTP body goes through Zod before touching the DB
4. **Availability and payment state always live** — never from cache (also in caching doc)
5. **httpOnly cookies only** — tokens never in `localStorage` or `sessionStorage`

---

## Auth flow

```
Register / Login
  → Zod validation (packages/schemas)
  → bcrypt verify (cost 12)
  → Sign JWT pair (packages/auth, HS256, audience-separated)
  → Set httpOnly cookies (tara_access 15min, tara_refresh 30d)
  → Return user object (no tokens in JSON body)

Authenticated request
  → Next.js Server Component / Action: reads tara_access cookie
  → verifyAccessToken() from packages/auth
  → Returns TokenPayload or null (never throws to UI)

API request (from web server → API)
  → JwtGuard reads Authorization: Bearer header
  → verifyAccessToken() rejects wrong audience or expired token
  → Returns 401 if invalid
```

### Cookie settings

| Property   | Value              | Why                                                |
| ---------- | ------------------ | -------------------------------------------------- |
| `httpOnly` | true               | Blocks JavaScript access — XSS cannot steal tokens |
| `secure`   | true in production | HTTPS only                                         |
| `sameSite` | `lax`              | Blocks CSRF from cross-site POST                   |
| `path`     | `/`                | Available to all routes                            |
| `maxAge`   | 900s / 2592000s    | Access 15min, refresh 30d                          |

---

## Input validation rules

All external input validated with Zod before any business logic runs.

```ts
// ✅ Correct — validate first, then use
const input = RegisterSchema.parse(body);
await this.auth.register(input);

// ❌ Wrong — using body directly
await this.auth.register(body as RegisterInput);
```

**Validation happens in two places:**

- API: `RegisterSchema.parse(body)` in the controller — returns 400 via `ZodExceptionFilter`
- Web: `RegisterSchema.safeParse(formData)` in Server Action — returns `{ error }` to the UI

Never validate only on the web. The API must always re-validate.

---

## Rate limiting

Implemented via `@nestjs/throttler`. Configured in `AppModule`:

| Tier     | Limit   | Window | Applied to                              |
| -------- | ------- | ------ | --------------------------------------- |
| `global` | 120 req | 60s    | All endpoints                           |
| `auth`   | 10 req  | 60s    | `AuthController` (all `/auth/*` routes) |

429 response on exceeded limit. The `auth` throttle overrides `global` for auth routes.

To skip throttle on a specific endpoint (e.g., health check):

```ts
@SkipThrottle()
@Get('health')
health() { ... }
```

---

## HTTP security headers

### API headers (via `@fastify/helmet`)

Registered in `main.ts`. Key headers set automatically:

| Header                      | Value                                       |
| --------------------------- | ------------------------------------------- |
| `X-Frame-Options`           | `SAMEORIGIN`                                |
| `X-Content-Type-Options`    | `nosniff`                                   |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains`       |
| `X-XSS-Protection`          | `0` (deprecated; CSP is the modern control) |

CSP is disabled on the API — it serves JSON, not HTML.

### Web headers (via `next.config.ts`)

Applied to all routes via `headers()`:

| Header                      | Value                                          | Purpose                 |
| --------------------------- | ---------------------------------------------- | ----------------------- |
| `X-Frame-Options`           | `DENY`                                         | Clickjacking prevention |
| `X-Content-Type-Options`    | `nosniff`                                      | MIME sniffing           |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | Limits referrer leakage |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`     | Feature restriction     |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS (2 years)          |
| `Content-Security-Policy`   | See below                                      | XSS mitigation          |
| `frame-ancestors 'none'`    | (part of CSP)                                  | Clickjacking            |
| `form-action 'self'`        | (part of CSP)                                  | Form hijacking          |

### CSP current state and roadmap

Current CSP allows `unsafe-inline` and `unsafe-eval` because Next.js App Router requires them for hydration. This weakens script injection protection.

**Roadmap to strict CSP:**

1. Phase A (now): `unsafe-inline` + `unsafe-eval` — acceptable, other controls compensate
2. Phase C (before real money): Implement nonce-based CSP using Next.js middleware
   - Generate a nonce per request in `middleware.ts`
   - Pass nonce via `headers()` to the page
   - Next.js 15 has built-in nonce support via `generateBuildId`

---

## CSRF protection

No explicit CSRF tokens needed. Three overlapping controls:

1. **SameSite=Lax cookies** — browser won't send cookies on cross-site POST requests
2. **Server Action origin check** — Next.js 14+ rejects Server Action calls from different origins automatically
3. **CORS on API** — restricted to `WEB_URL` only; cross-origin fetch from other sites returns 403

---

## Secrets management

| Secret              | Where stored                               | Who accesses                     |
| ------------------- | ------------------------------------------ | -------------------------------- |
| `JWT_SECRET`        | Host `.env` on home server, GitHub Secrets | API + Web containers via env var |
| `DATABASE_URL`      | Host `.env` on home server, docker-compose | API container                    |
| `STRIPE_SECRET_KEY` | Host `.env` (Phase C)                      | API container only               |
| Local dev secrets   | `.env` (gitignored)                        | Local process only               |

**Rules:**

- Never commit any value that isn't a placeholder
- `.env.example` has only `replace-with-...` placeholders
- Rotate `JWT_SECRET` if you suspect compromise (all sessions invalidated — users must re-login)
- No secret ever passed as a URL parameter or query string

---

## Dependency security

Run before every release:

```bash
pnpm audit                    # check for known vulnerabilities
pnpm audit --fix              # auto-fix where possible
pnpm outdated                 # review outdated packages
```

CI job (`pnpm audit`) to be added to the test pipeline in Phase B.

When a critical CVE is found:

1. Check if the vulnerable code path is reachable in Tara
2. If yes, patch immediately and deploy to staging
3. If no (transitive dep, unreachable path), document and schedule for next release

---

## What to do when adding a new feature

Checklist for every PR that adds a new API endpoint or web form:

- [ ] All request input validated with Zod
- [ ] Endpoint protected by `JwtGuard` if it requires auth
- [ ] No secrets, tokens, or PII in log output
- [ ] No raw SQL (use Drizzle query builder)
- [ ] Rate limiting applied if endpoint can be abused (e.g., contact form, search)
- [ ] Response never includes more data than the caller needs (no leaking full DB rows)
- [ ] If storing new PII, added to the data inventory comment in `packages/db/src/schema/`

---

## Incident response (security breach)

Philippine Data Privacy Act (RA 10173) requires notification to the National Privacy Commission and affected data subjects within 72 hours of discovering a breach.

1. **Contain**: revoke JWT_SECRET (all sessions invalidated), rotate DB password
2. **Assess**: what data was accessed? Which users?
3. **Notify**: within 72h — NPC, then affected users via email
4. **Document**: what happened, what was exposed, what was done
5. **Post-mortem**: how do we prevent recurrence?

Template notification email is in `docs/runbooks/` (to be created Phase C).
