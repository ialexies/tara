# Infrastructure

Deployable definitions for the home server and (eventually) cloud environments.

## Layout

```
infra/
├── docker-compose.dev.yml   # Local dev — Postgres, Redis, Mailpit, Adminer
├── portainer/                # Portainer stack definitions for the home server
│   ├── stacks/               # One file per stack (data, app, observability, etc.)
│   └── README.md
└── scripts/                  # Backup, restore, deploy helpers
```

## Conventions

- Every service has explicit `image` versions (no `latest` in production).
- Every service declares healthchecks where supported.
- Volumes are named, not anonymous — easier to back up and inspect.
- Secrets come from `.env` files, never hardcoded.
- Networks are explicit: `app-network`, `data-network`, `observability-network`.

See `docs/infra/home-server-services.md` for the planned topology.
