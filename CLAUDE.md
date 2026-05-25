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

## Infra

- Staging: `staging.tara-stays.com` — auto-deploys on push to `main` via GitHub Actions self-hosted runner
- Home server: `ialexies@192.168.0.253` — Portainer manages Docker stacks
- Cloudflare Tunnel: routes `tara-stays.com` subdomains to home server
