# Architecture Decision Records (ADRs)

An **ADR** is a short document that captures an important architectural decision: the context, the choice we made, and the consequences. ADRs are how we leave a trail for our future selves (and any future collaborators) so the *why* behind decisions doesn't get lost.

## Conventions

- One decision per ADR.
- Number sequentially: `0001-something.md`, `0002-something.md`, ...
- Immutable once accepted. To change a decision, write a new ADR that supersedes the old one and link them.
- Status: `Proposed` → `Accepted` → (eventually) `Superseded by ADR-XXXX` or `Deprecated`.
- Keep them short. One page is ideal. If it's longer than two, you might be writing a design doc, not an ADR.

## Template

See [`template.md`](template.md). Copy it when starting a new ADR.

## Index

<!-- Update this index when you add an ADR. -->

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-tech-stack.md) | Tech stack | Accepted |
| [0002](0002-modular-monolith-and-multi-tenancy.md) | Modular monolith + multi-tenancy from day 1 | Accepted |
| [0003](0003-development-workflow.md) | Development workflow — Windows + WSL2 → Ubuntu staging | Accepted |
| [0004](0004-payment-architecture.md) | Payment architecture — Stripe Connect Express + destination charges | Accepted |
| [0005](0005-payment-modes-per-property.md) | Payment modes per property — manual vs Stripe | Accepted |
| [0006](0006-notification-orchestration.md) | Notification orchestration — n8n in Phase B, NestJS module later | Accepted |
| [0007](0007-internationalization.md) | Internationalization — English + Tagalog from day 1, next-intl | Accepted |

## Further reading

- Michael Nygard's [original ADR post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr.github.io](https://adr.github.io/) — community resources
