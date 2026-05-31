# Restore Drill Log

## 2026-05-31 — Successful

- Drill duration: ~8 min
- Backup used: `tara_20260531_085541.sql.gz` (28K) — made minutes before drill
- Backup method: `pg_dump | gzip` to `~/backups/tara/` (local, not off-site)
- Row count match: ✅ properties=8, bookings=21, max(created_at)=2026-05-30 matches baseline
- Spot-check data: ✅ real property names returned
- App boot against restored DB: skipped — data verified via psql directly
- Cron set: ✅ `0 2 * * * backup-db.sh` now running on home server
- Notes:
  - Non-fatal `role "tara" does not exist` errors during restore — throwaway container only has `postgres` user. Tables still created and data loaded correctly. In a real DR scenario, create the `tara` role first: `CREATE ROLE tara;`
  - Backup is local only (no off-site / Backblaze B2 yet). The runbook's pgBackRest + B2 section is aspirational for Phase C. Current risk: home server failure = backup loss. Acceptable for Phase B.
  - `backup-db.sh` dumps from live `tara-staging-postgres-1` — no WAL/PITR capability, point-in-time restore not possible. Acceptable at this stage.
