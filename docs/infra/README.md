# Infrastructure

How this platform runs — locally, on the home server, and (eventually) on cloud.

## Documents

| File                                                 | Status  | Purpose                                                                |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| [`development-workflow.md`](development-workflow.md) | ✅ Done | Local dev setup (WSL2 + Docker), cross-platform conventions            |
| [`home-server-services.md`](home-server-services.md) | ✅ Done | Every service running on the home server, in what phase, on what ports |
| `deployment.md`                                      | 📝 TBD  | How code gets from `main` to production (after #11 staging pipeline)   |
| `cloud-migration.md`                                 | 📝 TBD  | Path from full self-host to hybrid cloud when revenue justifies        |
| `secrets-management.md`                              | 📝 TBD  | How secrets are stored, rotated, injected                              |

Backup / restore / DR moved to [`../runbooks/`](../runbooks/) where they belong.

## Current state

Self-hosted on Ubuntu home server with Portainer + Cloudflare Tunnel + Cloudflare CDN/WAF. See [`home-server-services.md`](home-server-services.md) for the full topology.
