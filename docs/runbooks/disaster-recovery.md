# Disaster Recovery

When the worst happens. Step-by-step procedures for catastrophic scenarios.

**Purpose:** if everything is on fire, this doc tells you what to do, in order, without thinking. You won't be thinking clearly when you need it.

> Prerequisites: [`backup-and-recovery.md`](backup-and-recovery.md) and [`restore-drill.md`](restore-drill.md). If you haven't done your monthly drill, this doc is hope, not a plan.

---

## When to read this doc

You're reading this because one of these happened:

- Home server is unreachable / destroyed (fire, theft, hardware death)
- Postgres data is corrupted beyond local recovery
- Ransomware / serious security breach
- Cloud provider catastrophic failure (Cloudflare, Stripe, B2)
- You're sick / unavailable and someone else needs to run things

**Before doing anything:**

1. Take a breath. Most disasters look worse than they are at first glance.
2. Don't make it worse by panicked actions (especially: don't delete things).
3. Document what you're doing in real-time (screenshot terminal, write notes).

---

## Scenario 1: Home server destroyed

**Symptoms:** SSH unreachable, no response on Cloudflare Tunnel, no metrics flowing to monitoring.

**Plan:** restore on a fresh cloud VPS within 4 hours.

### Step 1: Confirm the disaster (5 min)

```bash
# From any machine with internet
ssh ialexies@<home-server-public-ip>     # times out / refused
curl https://staging.tarastays.com       # 502 / unreachable
```

If only the public is unreachable: maybe just ISP outage; check ISP status, wait 1 hour.
If everything is gone: proceed.

### Step 2: Provision recovery infrastructure (30 min)

```bash
# Spin up a Hetzner VPS — CX31 (4 vCPU, 8GB RAM, 80GB disk) — about €15/mo
# Or use whatever cloud you have credentials for in the disaster envelope

# Once SSH'd in:
apt update && apt install -y postgresql-16 pgbackrest nginx certbot \
  docker.io docker-compose-v2 nodejs npm

# Install pnpm
corepack enable && corepack prepare pnpm@9.12.0 --activate
```

### Step 3: Restore Postgres from B2 (20-40 min)

```bash
# Configure pgBackRest with B2 credentials (from secrets vault)
cat > /etc/pgbackrest/pgbackrest.conf <<EOF
[global]
repo1-type=s3
repo1-s3-endpoint=s3.us-west-002.backblazeb2.com
repo1-s3-region=us-west-002
repo1-s3-bucket=tara-backups
repo1-s3-key=<B2_KEY_ID_FROM_VAULT>
repo1-s3-key-secret=<B2_KEY_SECRET_FROM_VAULT>
repo1-path=/pg
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<BACKUP_PASSPHRASE_FROM_VAULT>

[tara]
pg1-path=/var/lib/postgresql/16/main
EOF

# Stop Postgres if started during install
systemctl stop postgresql

# Restore
sudo -u postgres pgbackrest --stanza=tara restore

# Start it
systemctl start postgresql

# Verify
sudo -u postgres psql -d tara_dev -c "SELECT count(*) FROM properties;"
```

### Step 4: Restore application (30 min)

```bash
# Clone the repo (it's already on GitHub or your local backup)
git clone https://github.com/<user>/tara.git
cd tara
pnpm install
pnpm build

# Wire up env (from secrets vault)
cp .env.example .env
# Edit .env with restored credentials:
# - DATABASE_URL=postgres://tara:tara@localhost:5432/tara_dev
# - STRIPE_SECRET_KEY=...
# - RESEND_API_KEY=...
# - etc.

# Start services
pnpm --filter @tara/api start &
pnpm --filter @tara/web start &
```

### Step 5: Repoint DNS via Cloudflare (10 min)

```
Cloudflare dashboard → tarastays.com → DNS
  Update A records:
    @ → <new VPS public IP>
    staging → <new VPS public IP>
    api.staging → <new VPS public IP>
```

DNS propagates in 1-5 minutes (TTL 60 set in advance for this reason).

### Step 6: Verify (10 min)

```bash
curl https://staging.tarastays.com/en              # 200, page loads
curl https://api.staging.tarastays.com/health      # {"status":"ok"...}
curl https://api.staging.tarastays.com/properties  # real data
```

### Step 7: Notify (5 min)

- Post update on status page (Uptime Kuma was on home server, may need temporary statuspage.io)
- Discord: post in #incidents
- WhatsApp: message active property owners "Hey — we had a brief outage, everything is back, sorry for inconvenience"
- Twitter / LinkedIn: brief post if outage exceeded 1 hour

### Step 8: Postmortem (later that week)

Write a postmortem in `docs/runbooks/postmortems/YYYY-MM-DD-home-server-loss.md`:

- What happened (timeline)
- What broke
- What we did
- What worked
- What didn't work
- Action items to prevent recurrence

---

## Scenario 2: Postgres data corruption

**Symptoms:** queries return weird results, integrity constraint errors, app logs show DB errors.

**Plan:** identify scope, restore to point before corruption.

### Step 1: STOP writes (1 min)

```bash
# Put app in read-only mode (or stop API entirely if no read-only mode yet)
pkill -f "node.*api"

# Or set a feature flag:
echo "MAINTENANCE_MODE=true" >> /home/ialexies/projects/tara/.env
```

The longer you delay this, the more bad data gets written.

### Step 2: Identify corruption scope (10-30 min)

```sql
-- Connect to Postgres
sudo -u postgres psql -d tara_dev

-- Check for orphaned references, NULL constraint violations, etc.
-- Specific queries depend on what you noticed.

-- Example: find bookings with no booking_items (should never happen)
SELECT id, status, created_at FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM booking_items bi WHERE bi.booking_id = b.id);

-- Example: find inactive booking_items still referenced as "active" via trigger
SELECT bi.id, bi.unit_id, bi.night, b.status
FROM booking_items bi
JOIN bookings b ON b.id = bi.booking_id
WHERE bi.active != (b.status IN ('stripe_hold','manual_pending','awaiting_verification','confirmed','checked_in','disputed'));
```

Estimate: when did corruption start? Which records affected?

### Step 3: Decide restore strategy

| Scope                    | Strategy                                          |
| ------------------------ | ------------------------------------------------- |
| Single row / small set   | Manual fix in SQL (use audit log to reconstruct)  |
| Single table             | Restore that table only from backup               |
| Multiple tables, recent  | Point-in-time restore (PITR) to before corruption |
| Whole DB, unknown extent | Full restore from last known-good backup          |

### Step 4: Point-in-time restore (if needed)

```bash
# pgBackRest PITR — restore to the exact second
pgbackrest --stanza=tara --type=time \
  --target='2026-08-15 14:32:00+08' restore
```

Then verify with the queries from Step 2.

### Step 5: Resume writes + reconcile

```bash
# Lift maintenance mode
sed -i '/MAINTENANCE_MODE/d' .env

# Restart API
pnpm --filter @tara/api start &
```

Reconcile any bookings/payments that came in during downtime via Stripe webhook replay.

### Step 6: Postmortem

Same as scenario 1.

---

## Scenario 3: You can't work for 2+ weeks

You're sick, in a family emergency, traveling and unable to reach a computer.

**Plan:** Tara runs itself for a few weeks. Don't take new owners. Existing bookings flow.

### Step 1: Activate maintenance mode (have someone you trust SSH in or do this in advance)

The maintenance mode disables new property registrations but keeps existing functionality alive.

```bash
# .env
ALLOW_NEW_OWNER_SIGNUP=false
DISPUTE_ESCALATION_TO=<trusted-person-email>
```

### Step 2: Auto-responder on support

```
Subject: Re: <your subject>

Hi — Tara's founder is briefly unavailable but will respond by [date].
For urgent issues with a booking, contact the property owner directly via the dashboard.
For payment issues, Stripe has independently resolved disputes for our platform before.

Thanks for your patience.
```

### Step 3: Designated backup person

Document in a private file (NOT in the repo) who is authorized to:

- Read founder support WhatsApp
- Issue a refund via Stripe dashboard
- Pause a problematic property
- Reach out to a key partner

Phase B: this is a trusted friend / family member you've briefed in advance.
Phase D+: this is an ops team member.

### Step 4: Recover when you're back

- Read all queued messages
- Catch up on monitoring (Sentry, Grafana, Uptime Kuma)
- Reply with personal explanation, not corporate apology
- Update this doc with what you learned

---

## Scenario 4: Cloudflare account compromised

**Symptoms:** unexpected DNS changes, unfamiliar Workers deployed, R2 buckets accessed.

**Plan:** lock down + rotate within 1 hour.

### Step 1: Change Cloudflare password + force logout (5 min)

Dashboard → My Profile → API Tokens → revoke all
Dashboard → My Profile → Password change

### Step 2: Audit recent activity (15 min)

Dashboard → Audit Logs → past 7 days. Look for:

- IP changes you didn't make
- API token created you don't recognize
- DNS edits
- Worker deployments
- R2 access

Document everything before they're rotated out of visibility.

### Step 3: Rotate everything Cloudflare touches (30 min)

- All API tokens
- R2 access keys
- Worker secrets
- Tunnel tokens

Update `.env` on home server with new credentials, restart services.

### Step 4: Inform affected parties (15 min)

If guest/owner data was potentially exposed:

- **Notify PH NPC within 72 hours** (RA 10173 requirement)
- Notify affected users via email
- Public statement on Trust page

### Step 5: Postmortem + harden

- How did they get in? (likely: reused password, phishing, malware on dev machine)
- Enable hardware 2FA on Cloudflare
- Review API token scopes (least privilege)
- Audit log: set up alerting on unusual events

---

## Scenario 5: Stripe account banned

Rare but happens to marketplaces, especially in emerging markets.

**Plan:** activate PayMongo as immediate fallback; appeal Stripe; consider permanent switch.

### Step 1: Stop new bookings (immediate)

```bash
# Disable Stripe payment mode platform-wide via feature flag
echo "DISABLE_STRIPE_PAYMENTS=true" >> .env
# Restart API
```

All existing bookings already paid via Stripe are fine (their money is already in Stripe; flow continues).

### Step 2: Switch to PayMongo (1-3 days)

PayMongo integration was designed as a fallback (per ADR-0005). Activate it:

- Sign up at paymongo.com if not already
- Implement PayMongo PaymentIntent flow (similar API to Stripe)
- Deploy
- Re-enable payments via feature flag

Owners need to re-onboard with PayMongo (similar to Stripe Connect). Email them.

### Step 3: Appeal Stripe (parallel)

- Submit detailed appeal explaining business model (legitimate marketplace, not high-risk)
- Provide documentation (DTI registration, BIR receipts, sample transactions)
- Be patient: appeals can take weeks

### Step 4: If appeal denied: permanent switch

PayMongo becomes primary. Document the change in an ADR. Update payment architecture docs.

---

## Other scenarios (less detailed)

- **Backblaze B2 outage during restore:** restore from local pgBackRest repo1 instead; B2 is just one of two copies
- **Domain registrar issue (Cloudflare locked):** transfer to another registrar (have backup verified)
- **DDoS attack:** Cloudflare auto-mitigates most; if sustained, enable "Under Attack" mode in dashboard
- **Mass property owner exodus:** business problem, not DR — see risk register M-2 mitigation
- **Single bad PR breaks production:** rollback via git revert + redeploy; postmortem

---

## The disaster envelope (annual ritual)

Once a year, update the physical envelope at the trusted location:

Contents:

- Cloudflare account email + master password (sealed)
- Stripe account email + 2FA backup codes (sealed)
- Domain registrar credentials
- Backblaze B2 master credentials
- GitHub account credentials
- This runbook printed out
- Note: "Contact <trusted person> for help executing this plan"

Why physical: a digital-only backup of credentials is itself a single point of failure (if your password manager is compromised, you're locked out). Paper is the ultimate fallback.

---

## When this doc changes

- New scenario realized → write a procedure
- Procedure didn't work in real disaster → fix it
- Infrastructure changes (cloud migration) → rewrite affected scenarios
- Tools change → update commands
- After each real incident → review and improve relevant section
