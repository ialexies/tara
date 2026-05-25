# Runbooks

Step-by-step operational procedures. Written so a tired version of you at 2am can follow them.

## Conventions

- Every runbook starts with: **purpose**, **when to use**, **prerequisites**.
- Use numbered steps. Each step does one thing.
- Include the exact commands. No "you know what to do here."
- After every runbook, link to the relevant ADR or design doc for *why*.

## Planned runbooks

| File | When to use |
| --- | --- |
| `deploy.md` | Pushing a release to production |
| `rollback.md` | Reverting a bad deploy |
| `database-restore.md` | Restoring Postgres from backup |
| `restore-drill.md` | Monthly drill to verify backups work |
| `incident-response.md` | Site is down — what to do |
| `cert-renewal.md` | TLS certificate renewal |
| `stripe-webhook-replay.md` | A webhook was missed — how to replay |
| `migration-rollback.md` | Reverting a bad DB migration |
