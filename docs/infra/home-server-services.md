# Home Server Services Topology

Every service running on Tara's home server: what it does, which port, which phase, which container.

> Related: [`development-workflow.md`](development-workflow.md), [ADR-0003](../adr/0003-development-workflow.md), [ADR-0006](../adr/0006-notification-orchestration.md), [`backup-and-recovery.md`](../runbooks/backup-and-recovery.md).

This is the canonical reference for **what runs where**. When standing up a new VPS or rebuilding from scratch, this is the checklist.

---

## Host: home server (Ubuntu)

- **OS:** Ubuntu Server (22.04 or 24.04 LTS)
- **Container orchestration:** Portainer (managing Docker Compose stacks)
- **Public access:** Cloudflare Tunnel (no port forwarding, no exposed home IP)
- **Internal network:** all containers on a shared bridge network per stack
- **Hardware (current):** [insert specs] — typically 4-8 cores, 16-32GB RAM, mirrored disks

---

## The big picture

```
                            INTERNET
                                │
                                ▼
                ┌─────────────────────────────┐
                │   Cloudflare (DNS + WAF)    │
                └──────────────┬──────────────┘
                               │  (Cloudflare Tunnel; no inbound ports)
                ┌──────────────▼──────────────┐
                │       Home server           │
                │     (Ubuntu + Docker)       │
                └─┬─────────────┬─────────────┘
                  │             │
       ┌──────────┘             └──────────┐
       │                                   │
   ┌───▼──────────────┐         ┌──────────▼───────┐
   │  PUBLIC stack    │         │ INTERNAL stack   │
   │ (apps, edge)     │         │ (n8n, ollama,    │
   │                  │         │  flowise, etc.)  │
   └──────────────────┘         └──────────────────┘
       │
   ┌───▼──────────────┐
   │  DATA stack      │  ← shared by both
   │ (postgres,redis) │
   └──────────────────┘
```

Stacks are Portainer-managed, each `docker-compose.yml` lives in `infra/portainer/stacks/`.

---

## Service inventory by tier

### 🌐 EDGE (Cloudflare-fronted, public)

| Service       | Phase | Port         | Image / Source                  | Purpose                                                                                     |
| ------------- | ----- | ------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `cloudflared` | A     | — (outbound) | `cloudflare/cloudflared:latest` | Cloudflare Tunnel — routes traffic from `staging.tarastays.com` etc. to internal containers |

Tunnel config maps:

- `staging.tarastays.com` → `http://web:3000`
- `api.staging.tarastays.com` → `http://api:4000`
- `status.tarastays.com` → `http://uptime-kuma:3001`
- `n8n.tarastays.com` → `http://n8n:5678` (auth-protected via Cloudflare Access)
- `flowise.tarastays.com` → `http://flowise:3002` (auth-protected)

### ⚙️ APPLICATION (Tara product code)

| Service | Phase | Port | Image / Source         | Purpose                            |
| ------- | ----- | ---- | ---------------------- | ---------------------------------- |
| `web`   | A     | 3000 | built from `apps/web`  | Next.js 16 — public site + admin   |
| `api`   | A     | 4000 | built from `apps/api`  | NestJS — REST + tRPC API           |
| `jobs`  | B     | 4001 | built from `apps/jobs` | BullMQ workers for background jobs |

### 🗄️ DATA

| Service       | Phase | Port | Image                       | Purpose                                                     |
| ------------- | ----- | ---- | --------------------------- | ----------------------------------------------------------- |
| `postgres`    | A     | 5432 | `postgres:16.4-alpine`      | Primary database                                            |
| `redis`       | A     | 6379 | `redis:7.4-alpine`          | Cache + queue + holds                                       |
| `meilisearch` | C     | 7700 | `getmeili/meilisearch:v1.x` | Search engine (replaces Postgres FTS once volume justifies) |

### 🤖 AUTOMATION + AI (user's existing tools, integrated)

| Service   | Phase | Port  | Image                      | Purpose                                           |
| --------- | ----- | ----- | -------------------------- | ------------------------------------------------- |
| `n8n`     | A     | 5678  | `n8nio/n8n:latest`         | Workflow automation (notifications, integrations) |
| `flowise` | A     | 3002  | `flowiseai/flowise:latest` | Visual LLM workflow builder                       |
| `ollama`  | A     | 11434 | `ollama/ollama:latest`     | Local LLM runtime (Llama 3.1, Llava)              |
| `chroma`  | B     | 8001  | `chromadb/chroma:latest`   | Vector DB (RAG for support chatbot in late B)     |

### 📊 OBSERVABILITY

| Service                        | Phase | Port              | Image                                  | Purpose                                         |
| ------------------------------ | ----- | ----------------- | -------------------------------------- | ----------------------------------------------- |
| `uptime-kuma`                  | A     | 3001              | `louislam/uptime-kuma:latest`          | Uptime monitoring + status page                 |
| `wazuh-manager`                | A     | 1514, 1515, 55000 | `wazuh/wazuh-manager:latest`           | SIEM / file integrity / vuln scanning           |
| `wazuh-dashboard`              | A     | 5601              | `wazuh/wazuh-dashboard:latest`         | Wazuh UI                                        |
| `wazuh-indexer`                | A     | 9200              | `wazuh/wazuh-indexer:latest`           | Wazuh data backend                              |
| `posthog`                      | B     | 8000              | `posthog/posthog:latest` (self-hosted) | Product analytics                               |
| `metabase`                     | B     | 3033              | `metabase/metabase:latest`             | Business dashboards                             |
| `grafana`                      | C     | 3030              | `grafana/grafana:latest`               | Metrics + log dashboards                        |
| `prometheus`                   | C     | 9090              | `prom/prometheus:latest`               | Metrics collection                              |
| `loki`                         | C     | 3100              | `grafana/loki:latest`                  | Log aggregation                                 |
| `promtail`                     | C     | — (agent)         | `grafana/promtail:latest`              | Log shipper to Loki                             |
| `sentry` (self-host, optional) | D     | 9001              | `sentry/sentry:latest`                 | Error tracking (or use cloud free tier instead) |

### 🛡️ SECURITY

Covered above (Wazuh in observability section since it's both).

Also:

| Service               | Phase | Port | Image                           | Purpose                                                        |
| --------------------- | ----- | ---- | ------------------------------- | -------------------------------------------------------------- |
| `crowdsec` (optional) | C     | 8080 | `crowdsecurity/crowdsec:latest` | Crowd-sourced threat protection (complement to Cloudflare WAF) |

### 🔧 DEV / OPS

| Service                | Phase   | Port         | Image                           | Purpose                                                  |
| ---------------------- | ------- | ------------ | ------------------------------- | -------------------------------------------------------- |
| `portainer`            | A       | 9443 (HTTPS) | `portainer/portainer-ce:latest` | Container management UI                                  |
| `mailpit`              | A (dev) | 1025, 8025   | `axllent/mailpit:v1.20`         | Dev SMTP catch-all (dev env only)                        |
| `adminer`              | A (dev) | 8081         | `adminer:4-standalone`          | DB browser (dev env only)                                |
| `watchtower`           | A       | — (daemon)   | `containrrr/watchtower`         | Auto-update containers (cautious mode: only minor/patch) |
| `gh-actions-runner`    | A       | — (daemon)   | `myoung34/github-runner:latest` | Self-hosted GitHub Actions runner                        |
| `pgbackrest`           | A       | — (cron)     | custom build                    | Postgres backup orchestration                            |
| `restic` (alternative) | A       | — (cron)     | `restic/restic:latest`          | Generic file backup                                      |

### 📦 REGISTRY (Phase B+)

| Service    | Phase | Port | Image        | Purpose                                                   |
| ---------- | ----- | ---- | ------------ | --------------------------------------------------------- |
| `registry` | B     | 5000 | `registry:2` | Local Docker registry — CI pushes images, Portainer pulls |

---

## Stacks (Portainer organization)

Group services into stacks for easier management:

```
infra/portainer/stacks/
├── edge.yml             # cloudflared
├── data.yml             # postgres, redis
├── app.yml              # web, api, jobs
├── automation.yml       # n8n, flowise, ollama
├── observability.yml    # uptime-kuma, grafana, prometheus, loki, posthog, metabase
├── security.yml         # wazuh (3 containers)
├── devops.yml           # portainer, mailpit, adminer, watchtower, runner
└── registry.yml         # local docker registry (Phase B+)
```

Each stack has its own `docker-compose.yml` checked into git, deployed via Portainer.

---

## Phased deployment

### Phase A (Months 0-6) — minimum to run dev + early prod

```
✓ portainer            (manage everything)
✓ cloudflared          (public access)
✓ postgres, redis      (data)
✓ web, api             (apps)
✓ n8n, flowise, ollama (user already has these)
✓ wazuh stack          (security)
✓ uptime-kuma          (monitoring)
✓ mailpit, adminer     (dev)
✓ pgbackrest           (backups)
✓ gh-actions-runner    (CI)
✓ watchtower           (auto-update)
```

### Phase B (Months 6-12) — add analytics + jobs

```
+ jobs (BullMQ workers)
+ posthog (self-hosted product analytics)
+ metabase (business dashboards)
+ chroma (vector DB for AI chatbot)
+ local docker registry
```

### Phase C (Months 12-24) — full observability + search

```
+ grafana
+ prometheus
+ loki + promtail
+ meilisearch
+ crowdsec (optional)
```

### Phase D+ — split off to cloud as load justifies

Migration triggers:

- ISP outage frequency exceeds tolerance
- Hardware can't keep up with load
- 24/7 ops burden too high

Cloud targets:

- Vercel (web)
- Railway / Fly.io (api, jobs)
- Neon / RDS (postgres)
- Upstash (redis)
- Cloudflare R2 (already cloud)
- Home server becomes dev/staging/secondary observability only

See [ADR-0003](../adr/0003-development-workflow.md) for the cloud migration plan.

---

## Resource allocation (rough Phase A-B)

For a 16GB RAM home server:

| Service                     | RAM allocation                    | CPU                           |
| --------------------------- | --------------------------------- | ----------------------------- |
| postgres                    | 4 GB                              | 2 vCPU                        |
| redis                       | 1 GB                              | 1 vCPU                        |
| web                         | 1 GB                              | 1 vCPU                        |
| api                         | 2 GB                              | 1-2 vCPU                      |
| jobs                        | 1 GB                              | 1 vCPU                        |
| ollama (idle)               | 1 GB                              | varies; uses GPU if available |
| ollama (active)             | 6-8 GB (with Llama 3.1 8B loaded) | 4+ vCPU or GPU                |
| n8n                         | 512 MB                            | 0.5 vCPU                      |
| flowise                     | 1 GB                              | 1 vCPU                        |
| chroma                      | 512 MB                            | 0.5 vCPU                      |
| posthog                     | 2 GB                              | 1 vCPU                        |
| metabase                    | 1.5 GB                            | 1 vCPU                        |
| wazuh stack                 | 2 GB                              | 1 vCPU                        |
| uptime-kuma                 | 256 MB                            | 0.25 vCPU                     |
| grafana / loki / prometheus | 1.5 GB                            | 1 vCPU                        |
| portainer + others          | 512 MB                            | 0.5 vCPU                      |

**Peak total: ~25 GB** if Ollama is actively inferencing. **Idle: ~15 GB.**

This means:

- 16 GB RAM is tight in Phase B with Ollama actively running. **Recommend 32 GB.**
- If hardware-limited, Ollama can be moved to a dedicated AI machine OR replaced with Claude Haiku API ($5-20/mo) for that workload

GPU optional but transformative for Ollama. A used RTX 3060 (~₱15-20k) makes inference 20-50× faster.

---

## Network topology

```
Docker bridge networks:
  tara-edge        ← cloudflared, web, api
  tara-data        ← postgres, redis (api+jobs+metabase connect here)
  tara-automation  ← n8n, flowise, ollama, chroma
  tara-observability ← grafana, prometheus, loki, etc.
  tara-security    ← wazuh stack
```

Inter-network access controlled by docker-compose `networks:` declarations. Principle of least privilege: each service joins only networks it needs.

---

## Disk layout

```
/var/lib/postgresql/16/main      Postgres data (consider dedicated SSD)
/var/backups/pgbackrest/         Local backup archive (Tier 1)
/var/lib/docker/volumes/         Named volumes (n8n data, redis AOF, etc.)
/home/ialexies/projects/tara/    Project source (when running tsx-based dev)
/opt/tara/                       Production app deploys (Phase B+)
/var/log/tara/                   Application logs (rotated)
```

Mount the largest disk on `/var/lib/postgresql` and `/var/backups`. Photos go to Cloudflare R2 (no local disk burn).

---

## Bootstrapping a fresh server

If rebuilding from scratch (new hardware, migration):

```bash
# 1. Ubuntu base setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban
sudo apt install -y docker.io docker-compose-v2 docker-compose
sudo usermod -aG docker $USER

# 2. Firewall (Cloudflare Tunnel handles ingress; only need SSH)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable

# 3. fail2ban for SSH brute force protection
sudo systemctl enable fail2ban

# 4. Clone project (if applicable)
mkdir -p ~/projects && cd ~/projects
git clone <repo> tara
cd tara

# 5. Set up secrets (from vault)
cp .env.example .env
# Edit with real values

# 6. Deploy Portainer first
docker volume create portainer_data
docker run -d -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# 7. Login to Portainer at https://<server-ip>:9443, then:
#    - Deploy edge.yml stack first (cloudflared)
#    - Then data.yml (postgres, redis)
#    - Then app.yml
#    - Then automation.yml
#    - etc. in phase order
```

---

## Updates and maintenance

| What                          | When               | How                                                                  |
| ----------------------------- | ------------------ | -------------------------------------------------------------------- |
| OS security updates           | Weekly (Sunday)    | `unattended-upgrades` for security; manual for others                |
| Container minor/patch updates | Daily              | Watchtower auto-applies for tagged-stable images                     |
| Container major version       | Manually as needed | Test on staging copy first                                           |
| Postgres minor (16.4 → 16.5)  | Manually           | Standard `apt upgrade postgresql-16` + restart                       |
| Postgres major (16 → 17)      | Bigger event       | Plan migration; pgBackRest helps                                     |
| Wazuh updates                 | Quarterly          | Follow upstream guide; coordinate manager/dashboard/indexer versions |

Watchtower is configured to ONLY update images tagged `:latest` or `:stable`. Pinned versions (`:16.4-alpine`) are NEVER auto-updated. Safe default.

---

## What we deliberately don't run on the home server

| Service                  | Why elsewhere                                         |
| ------------------------ | ----------------------------------------------------- |
| Production photos        | Cloudflare R2 (zero egress fees beats self-hosting)   |
| Production DNS           | Cloudflare (free, global)                             |
| Email sending            | Resend (deliverability is hard; cheaper to outsource) |
| SMS sending              | Semaphore (PH local provider; we don't run telcoms)   |
| Payment processing       | Stripe (we're not a money transmitter)                |
| Production load balancer | Cloudflare (already in the path)                      |
| Production WAF           | Cloudflare (already in the path)                      |

The home server runs the **stuff that benefits from local control + zero per-call cost**. Cloud handles the **stuff that's specialized + commodity**.

---

## When this doc changes

- New service added → add to inventory table + appropriate stack
- Phase rollout shifts → update the phased section
- Hardware upgrade → update resource allocation
- Migration to cloud → mark services moved + maintain dual configuration during transition
