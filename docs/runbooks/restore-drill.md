# Monthly Restore Drill

**Purpose:** verify backups actually work by restoring to a throwaway environment. Untested backups are not backups.

**When to use:** first weekday of every month. Calendar reminder. 30-60 minutes.

**Why this exists:** I/O errors, encryption mistakes, retention bugs, credential rotations — any of these can silently break backups. The only way to know is to do a restore drill. **Don't skip this.**

---

## Prerequisites

- Access to the home server (SSH + sudo)
- Backblaze B2 credentials (in secrets vault)
- Docker installed
- ~30 min uninterrupted time

---

## The drill — 7 steps

### 1. Note baseline (1 min)

```bash
# On home server
cd ~/projects/tara
pnpm db:psql -c "SELECT count(*) FROM properties;"   # remember this number
pnpm db:psql -c "SELECT max(created_at) FROM properties;" # remember this timestamp
```

Write these numbers down. We'll verify the restored DB matches.

### 2. Spin up a throwaway Postgres (2 min)

```bash
docker run -d \
  --name tara-restore-test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=postgres \
  -p 5433:5432 \
  postgres:16.4-alpine
```

This runs alongside your real DB on a different port (5433). Doesn't touch real data.

### 3. Restore from Backblaze B2 (10-20 min depending on DB size)

This is the real test — pull from off-site backup, not local. Local restore is too easy.

```bash
# Configure pgBackRest to restore from B2 (repo2) into the test container
docker exec -it tara-restore-test bash -c "
  apt-get update && apt-get install -y pgbackrest

  # Inject minimal pgbackrest.conf
  cat > /etc/pgbackrest/pgbackrest.conf <<EOF
[global]
repo1-type=s3
repo1-s3-endpoint=s3.us-west-002.backblazeb2.com
repo1-s3-region=us-west-002
repo1-s3-bucket=tara-backups
repo1-s3-key=\${B2_KEY_ID}
repo1-s3-key-secret=\${B2_KEY_SECRET}
repo1-path=/pg
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=\${BACKUP_PASSPHRASE}

[tara]
pg1-path=/var/lib/postgresql/data
EOF

  pgbackrest --stanza=tara restore
"
```

Watch the logs. Should complete in 5-15 min for a Phase B-size database.

### 4. Boot the restored Postgres (2 min)

```bash
docker restart tara-restore-test

# Wait for it to come up
until docker exec tara-restore-test pg_isready; do sleep 2; done
```

### 5. Verify data (2 min)

```bash
# Compare against baseline noted in step 1
docker exec -it tara-restore-test psql -U postgres -c "
  SELECT count(*) FROM properties;
"
# Should match (or be one more if a new property was added since baseline)

docker exec -it tara-restore-test psql -U postgres -c "
  SELECT max(created_at) FROM properties;
"
# Should match baseline (or be within seconds of latest WAL applied)

# Spot-check actual data
docker exec -it tara-restore-test psql -U postgres -c "
  SELECT id, name, region FROM properties LIMIT 5;
"
# Should look like real properties, not corrupted
```

### 6. Boot the app against the restored DB (5 min)

```bash
DATABASE_URL=postgres://postgres:test@localhost:5433/tara_dev \
  pnpm --filter @tara/api dev &

# Wait for it to come up
sleep 5

# Hit the health endpoint
curl http://localhost:4000/health
# {"status":"ok",...}

# Hit a real endpoint
curl http://localhost:4000/properties
# Should return your test properties
```

✅ If this works → backup is valid. Real data is recoverable.

### 7. Tear down (1 min)

```bash
# Stop API process
kill %1 2>/dev/null || true

# Stop and remove test container + volume
docker stop tara-restore-test
docker rm tara-restore-test
```

---

## What "success" looks like

- ✅ Restore completed without errors
- ✅ Row counts match baseline (within expected delta)
- ✅ Spot-check data looks correct (not garbage)
- ✅ App boots against restored DB
- ✅ Health endpoint returns 200
- ✅ Real endpoints return real data

Anything missing → **investigate immediately.** Don't move on.

---

## What to do if the drill fails

| Failure                                   | Probable cause                              | Action                                                   |
| ----------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| pgBackRest can't reach B2                 | Wrong credentials, network issue, B2 outage | Check credentials in vault; check B2 status page         |
| Decryption fails                          | Passphrase mismatch                         | Verify passphrase in vault matches one in backup config  |
| Restore completes but data is missing/old | WAL archiving failed silently               | Check `archive_command` logs; check WAL push monitoring  |
| App can't connect                         | Wrong creds, Postgres not booted            | Standard debug                                           |
| App boots but data is corrupted           | Backup corruption (rare)                    | Restore from older backup; investigate corruption window |

If you can't get a successful restore → **stop and fix.** Backups that don't restore = no backups.

---

## Document the drill

After each drill, write a note in `docs/runbooks/restore-drill-log.md`:

```markdown
## 2026-06-03 — Successful

- Drill duration: 18 min
- Backup age restored: 22h old
- Row count match: ✅ (1,247 properties, matched baseline)
- App boot: ✅
- Notes: B2 download speed slow (~3 MB/s), consider larger Hetzner VPS for staging restore in Phase C
```

Or:

```markdown
## 2026-07-01 — FAILED — restored DB was 5 days old

- Drill duration: 25 min before noticing
- Root cause: WAL archive_command silently failed since 2026-06-26 when Postgres credentials rotated
- Fix: updated pgbackrest passphrase; manually restored continuity; added monitoring alert on WAL lag > 5 min
- Action items:
  - [x] Set up Prometheus alert on WAL archive failures
  - [ ] Document credential rotation runbook (#TBD)
```

**The failure logs are more valuable than the success logs.** Read them annually.

---

## When this doc changes

- Backup tool changes (e.g., switch from pgBackRest to wal-g) → rewrite procedure
- New data class to verify in restore (e.g., chat threads) → add verification step
- RTO target changes → time the drill, see if achievable
- Hosting change (cloud migration Phase C+) → restore drill targets cloud DB
