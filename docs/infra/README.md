# Infrastructure

How this platform runs — locally, on the home server, and (eventually) on cloud.

## Planned documents

| File | Purpose |
| --- | --- |
| `home-server-services.md` | What runs on the home server, in what phase, on what ports |
| `dev-environment.md` | Local dev setup: docker-compose, env vars, common workflows |
| `deployment.md` | How code gets from `main` to production |
| `cloud-migration.md` | Path from full self-host to hybrid cloud when revenue justifies |
| `backup-and-recovery.md` | Backup strategy, restore drills, DR procedures |
| `secrets-management.md` | How secrets are stored, rotated, injected |

## Current state

Self-hosted on Ubuntu home server with Portainer + Cloudflare Tunnel + Cloudflare CDN/WAF. See [`home-server-services.md`](home-server-services.md) once written for the full topology.
