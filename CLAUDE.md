# Tara — Claude Guidelines

## Project

Booking marketplace for Philippine hostels. Two-sided: guests book, owners list.
Monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS), shared `packages/`.

## Mobile first — always

The majority of Tara's users are on mobile. Every UI decision must start from mobile.

- **Write mobile styles first**, then use `sm:` / `md:` / `lg:` to scale up. Never the reverse.
- **Tap targets** must be at least 44×44px (Apple/Google guideline).
- **Use `dvh`** not `vh` — iOS Safari's 100vh bug is real.
- **Safe areas**: use `.pb-safe`, `.pt-safe`, `.pl-safe`, `.pr-safe` for any fixed bars that overlap the home indicator or notch.
- **Test at 375px wide** (iPhone SE) as the minimum viewport. If it breaks there, it's broken.
- **No hover-only interactions** — anything interactive must work on touch.
- **Font sizes**: minimum `text-sm` (14px) for body copy on mobile.
- When reviewing or writing any frontend code, always ask: _does this work on a 375px screen?_

## Architecture

- `packages/schemas` — Zod schemas, source of truth for all data shapes
- `packages/db` — Drizzle ORM, postgres client
- Shared types flow: schema → API → web (never web → API)

## Code style

- No comments unless the WHY is non-obvious
- No premature abstractions
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

## Logging (apps/api)

Structured logging via `nestjs-pino`. Every log line is JSON in production and auto-binds `reqId` for in-request correlation.

- **Log objects, never strings.** `this.logger.log({ event: 'booking.created', bookingId, userId })` — not `` `created booking ${id}` ``.
- **Event names**: `noun.verb` past tense, snake_case fields. Examples: `booking.created`, `payment.failed`, `auth.session.create_failed`. Match the analytics taxonomy in [docs/architecture/analytics.md](docs/architecture/analytics.md).
- **Log at boundaries, not internals.** Worth logging: external API calls (Stripe, Firebase, R2), money mutations, auth events, caught-and-swallowed errors. Skip: indexed reads, getters, pure transforms, loop iterations.
- **Inject via `new Logger(ClassName.name)`** from `@nestjs/common` for 95% of cases. Use `PinoLogger.assign(...)` only when you need request-scoped bound context.
- **No `console.log`.** It bypasses the structured stream and won't be queryable in Loki.
- Reference pattern: [apps/api/src/auth/auth.service.ts](apps/api/src/auth/auth.service.ts).

## Infra

- Staging: `staging.tara-stays.com` — auto-deploys on push to `main` via GitHub Actions self-hosted runner
- Home server: `ialexies@192.168.0.253` — Portainer manages Docker stacks
- Cloudflare Tunnel: routes `tara-stays.com` subdomains to home server

## Image uploads (R2) — checklist every time

`UploadsService` throws `503 "Image uploads are not configured"` when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, or `R2_SECRET_ACCESS_KEY` are missing from the API container's environment. This has bitten us on every image feature. Do all of the following before calling an image upload feature done:

### 1. Verify local dev

```bash
curl -si http://localhost:4000/properties/<id>/upload-url \
  -X POST -H "Content-Type: application/json" -d '{"contentType":"image/jpeg"}'
# Must return 401 (auth required), NOT 503 (service unavailable)
```

A `503` here means `.env` is missing `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.

### 2. Add the API call to `api-client.ts`

Every new upload surface needs methods in both:

- `api.rooms.getImageUploadUrl` / `api.properties.getImageUploadUrl` — for cover images
- matching `getImageUploadUrl` variant for gallery images

### 3. How staging env vars work

The staging API reads credentials from `/home/ialexies/stacks/tara-staging/.env` on the home server. There are two deploy paths with different behaviour:

| Deploy path                        | Reads env from                            | R2 included?               |
| ---------------------------------- | ----------------------------------------- | -------------------------- |
| Push to `main` → GitHub Actions CI | `/home/ialexies/stacks/tara-staging/.env` | ✅ Always                  |
| Manual redeploy via Portainer UI   | Portainer's stored stack env vars         | ⚠️ Only if added there too |

**After any manual Portainer redeploy, check Portainer → tara-staging stack → Environment Variables and confirm `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` are present.** If they're missing, either add them in the Portainer UI or push to `main` to trigger CI.

### 4. Verify staging after deploy

```bash
# 401 = auth working, R2 configured. 503 = R2 missing.
curl -si https://api-staging.tara-stays.com/properties/<id>/upload-url \
  -X POST -H "Content-Type: application/json" -d '{"contentType":"image/jpeg"}' \
  | head -3
```

### 5. Required env vars (API)

| Var                    | Where it's set                                           |
| ---------------------- | -------------------------------------------------------- |
| `R2_ACCOUNT_ID`        | `/home/ialexies/stacks/tara-staging/.env` + Portainer UI |
| `R2_ACCESS_KEY_ID`     | same                                                     |
| `R2_SECRET_ACCESS_KEY` | same                                                     |
| `R2_BUCKET`            | same (default: `tara-dev` locally, `tara` on staging)    |
| `R2_PUBLIC_URL`        | same — must be `https://`, not `http://` (CORS)          |

`NEXT_PUBLIC_SENTRY_DSN` is a build arg for the web image — it must be in `.env` at project root and passed via `--build-arg` in the Dockerfile / `docker-compose.dev.yml`.
