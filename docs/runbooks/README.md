# Runbooks

Step-by-step operational procedures. Written so a tired version of you at 2am can follow them.

## Conventions

- Every runbook starts with: **purpose**, **when to use**, **prerequisites**.
- Use numbered steps. Each step does one thing.
- Include the exact commands. No "you know what to do here."
- After every runbook, link to the relevant ADR or design doc for _why_.

## Runbooks

| File                                               | Status  | When to use                                                          |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| [`backup-and-recovery.md`](backup-and-recovery.md) | ✅ Done | Reference: what we back up, where, how often, RPO/RTO                |
| [`restore-drill.md`](restore-drill.md)             | ✅ Done | First weekday of every month — verify backups actually work          |
| [`disaster-recovery.md`](disaster-recovery.md)     | ✅ Done | Worst-case scenarios: server destroyed, data corruption, account ban |
| `deploy.md`                                        | 📝 TBD  | Pushing a release to production (after #11 staging pipeline)         |
| `rollback.md`                                      | 📝 TBD  | Reverting a bad deploy                                               |
| `incident-response.md`                             | 📝 TBD  | Site is down — what to do                                            |
| `cert-renewal.md`                                  | 📝 TBD  | TLS certificate renewal                                              |
| `stripe-webhook-replay.md`                         | 📝 TBD  | A webhook was missed — how to replay                                 |
| `migration-rollback.md`                            | 📝 TBD  | Reverting a bad DB migration                                         |
| `postmortems/`                                     | 📝 TBD  | One file per real incident (great learning)                          |
