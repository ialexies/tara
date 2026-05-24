# Documentation

This is the project's source of truth for architecture, domain modeling, operations, and business strategy.

| Directory | Purpose |
| --- | --- |
| [`adr/`](adr/) | Architecture Decision Records — why we chose what we chose |
| [`domain/`](domain/) | Booking domain modeling, glossary, state machines |
| [`infra/`](infra/) | Infrastructure, deployment, home server, environments |
| [`runbooks/`](runbooks/) | Operations: deploys, incidents, backups, restores |
| [`business/`](business/) | Business model, personas, regional strategy |
| [`api/`](api/) | API reference (generated + handwritten) |

## Writing conventions

- Markdown only. No proprietary formats.
- Use relative links between docs so they work locally and on GitHub.
- ADRs are immutable once accepted. Superseded ADRs link forward to their replacement.
- Domain docs are living — update them alongside code changes.
