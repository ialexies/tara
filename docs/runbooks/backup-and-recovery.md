# Backup & Recovery Strategy

How Tara protects against data loss and what's recoverable in what timeframe. **Backups are only as good as the last successful restore drill.**

> Related: [`restore-drill.md`](restore-drill.md) (monthly procedure), [`disaster-recovery.md`](disaster-recovery.md) (worst-case scenarios), risk register R-2/T-3/T-6.

---

## What we back up, where, and how often

### Primary data: Postgres database

The most critical asset. Backed up in three tiers:

| Tier                      | Tool                             | Where                                        | Frequency                             | Retention | Purpose                                            |
| ------------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------- | --------- | -------------------------------------------------- |
| **Tier 1: Continuous**    | pgBackRest WAL archiving         | Local home server `/var/backups/pgbackrest/` | Real-time (WAL stream) + nightly full | 30 days   | Point-in-time recovery to any second within window |
| **Tier 2: Off-site**      | pgBackRest push to Backblaze B2  | `b2://tara-backups/pg/`                      | Hourly WAL upload, daily full         | 90 days   | Survive home server destruction                    |
| **Tier 3: Cloud standby** | Streaming replication (Phase C+) | Hetzner VPS (€5/mo)                          | Real-time                             | live      | Hot-promotable failover                            |

Tier 1 alone protects against most data loss. Tier 2 protects against home server destruction. Tier 3 minimizes downtime when revenue justifies the cost.

### Photos: Cloudflare R2

R2 has 11 nines durability built-in. Additionally:

| Backup            | Where                                | Frequency | Retention  |
| ----------------- | ------------------------------------ | --------- | ---------- |
| Cross-bucket sync | `b2://tara-photos-cold/` (Backblaze) | Weekly    | Indefinite |

Photos are append-only (we never overwrite). The risk is accidental delete; the cold backup is the safety net.

### Application state: Redis

**We don't back up Redis.** Redis holds ephemeral state (booking holds, session cache). Loss is recoverable from Postgres (the source of truth). If Redis is wiped, expired hold sweeper reconciles.

### Config & secrets

- **Public config** (commit-able): in git, backed up via GitHub remote
- **Secrets** (.env, Stripe keys, etc.): manually backed up to encrypted Bitwarden / 1Password
- **Cloudflare config**: exported quarterly (DNS records, Tunnel config, R2 bucket policies)
- **n8n workflows**: exported as JSON to `infra/n8n/workflows/` and committed to git

### What we deliberately don't back up

- Build artifacts, `node_modules`, generated files → regenerable
- CDN cache contents → cache is by definition disposable
- Application logs (older than 30 days) → archived to S3 Glacier for compliance, not for restore

---

## RTO and RPO targets

| Scenario                                    | RPO (max data loss)          | RTO (recovery time)                                  |
| ------------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| Single corrupted row (logical error)        | 0 (PITR back to that second) | < 15 min                                             |
| Postgres process crash                      | 0                            | < 5 min (automatic restart)                          |
| Home server disk failure                    | < 5 min                      | < 1 hour (restore from local WAL backup to new disk) |
| Home server total destruction (fire, theft) | < 1 hour                     | < 4 hours (restore from B2 to cloud VPS)             |
| Cloudflare account compromise               | depends                      | < 24 hours (rotate keys, restore R2)                 |
| Stripe account ban                          | depends                      | days (escalation, can move to PayMongo)              |

Stricter RTO/RPO requires more infrastructure cost. These targets balance "good enough" with Phase B budget.

---

## pgBackRest setup

```yaml
# /etc/pgbackrest/pgbackrest.conf
[global]
repo1-path=/var/backups/pgbackrest
repo1-retention-full=7
repo1-retention-diff=3
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<random-256-bit-secret>  # from secrets vault

repo2-type=s3
repo2-s3-endpoint=s3.us-west-002.backblazeb2.com
repo2-s3-region=us-west-002
repo2-s3-bucket=tara-backups
repo2-s3-key=<b2-keyid>
repo2-s3-key-secret=<b2-keysecret>
repo2-path=/pg
repo2-retention-full=12
repo2-cipher-type=aes-256-cbc
repo2-cipher-pass=<same-passphrase>

[tara]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-user=postgres
```

**Cron schedule:**

```cron
# Full backup nightly at 02:00 PHT
0 18 * * * pgbackrest --stanza=tara --type=full --repo=1 backup

# Differential backup every 6 hours
0 0,6,12 * * * pgbackrest --stanza=tara --type=diff --repo=1 backup

# Push WAL continuously (handled by Postgres archive_command)

# Push to B2 (repo2): once daily after full
30 18 * * * pgbackrest --stanza=tara --type=full --repo=2 backup
```

**postgresql.conf:**

```
archive_mode = on
archive_command = 'pgbackrest --stanza=tara archive-push %p'
wal_level = replica
```

---

## Photo backup script

```bash
#!/usr/bin/env bash
# /home/ialexies/scripts/backup-photos.sh
# Weekly sync of R2 photos bucket to Backblaze B2 cold storage.

set -euo pipefail

R2_BUCKET="tara-photos-prod"
B2_BUCKET="tara-photos-cold"

# rclone configured for both R2 and B2 in ~/.config/rclone/rclone.conf
# Encryption layer optional; R2 + B2 both encrypt at rest

rclone sync \
  "r2:${R2_BUCKET}" \
  "b2:${B2_BUCKET}" \
  --transfers 16 \
  --checkers 32 \
  --log-file /var/log/tara/photo-backup.log

echo "Photo backup completed at $(date -u)"
```

Cron: weekly Sunday at 03:00 PHT.

---

## Audit log retention

Tara's audit log (`booking_events`, future `audit_events`) is **append-only, never deleted, retained indefinitely.**

For compliance (PH Data Privacy Act) and dispute history, audit data may be requested years after the fact.

Storage cost negligible (text-only).

---

## Secrets backup

Secrets live in:

1. Production `.env` on the home server (mode 600, owned by app user)
2. **Encrypted backup** in Bitwarden / 1Password (manual update each rotation)
3. **Disaster envelope:** printed master credentials in sealed envelope at trusted physical location

The disaster envelope is for the "founder hit by bus" scenario. Contains: Cloudflare account credentials, Stripe API key access, domain registrar login, Backblaze recovery credentials. Never digital; physical only. Reviewed annually.

---

## Backup health monitoring

| Check                                   | Frequency                  | Alert if...                     |
| --------------------------------------- | -------------------------- | ------------------------------- |
| `pgbackrest info` returns recent backup | Hourly cron                | last full > 26h old             |
| WAL archive lag                         | Every 5 min via Prometheus | lag > 5 min                     |
| B2 backup completed today               | Daily cron                 | not present by 04:00 PHT        |
| Photo sync completed this week          | Weekly                     | not present by Monday 06:00 PHT |
| Restore drill performed this month      | Monthly                    | not performed (Discord alert)   |

Alerts go to founder via Discord webhook + email.

---

## Cost summary

| Item                             | Cost/mo                                 |
| -------------------------------- | --------------------------------------- |
| Local backup storage (3TB disk)  | one-time hardware cost; ~₱150 amortized |
| Backblaze B2 (~10GB at Phase B)  | ~₱3                                     |
| Photos cold storage in B2 (~3GB) | ~₱1                                     |
| Cloud standby VPS (Phase C+)     | ~₱300 (€5)                              |
| **Phase B total**                | **< ₱200/mo**                           |
| **Phase C total**                | **< ₱500/mo**                           |

Cheap insurance against catastrophic loss.

---

## When this doc changes

- New data class added (e.g., chat messages in Phase 2) → update what we back up
- New retention requirement → update tier configs
- RTO/RPO targets change → update + verify drill achieves them
- New tools / cost changes → update cost summary
