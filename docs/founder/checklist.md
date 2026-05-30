# Founder Checklist

Things to verify, periodically and at phase transitions. This is your "don't forget" doc — open it during weekly reviews, before launches, and whenever you feel like something is being missed.

> **For Claude:** see `founder_reminders.md` in memory for the watch list Claude should surface naturally in conversation.

---

## 🚦 Phase transition gates

These must be true before moving between phases. Don't shortcut them.

### Before Phase A → Phase B (first real owner onboarded)

- [ ] Stripe Connect PH onboarding tested end-to-end (do a test onboarding with your own info, get to "active", then close the test account)
- [ ] Manual payment mode flow tested with mock data (screenshot upload, owner verification, dispute path)
- [ ] All notification channels tested (email, WhatsApp, web push) — actual send and receipt confirmed
- [x] T&C + Privacy Policy + Cookie Policy published (from Termly or similar templates — lawyer review can wait until Phase C)
- [ ] Backup restore drill completed successfully — script is at `infra/scripts/backup-db.sh`, cron in CLAUDE.md; run the drill before Phase B
- [x] Critical user paths have E2E tests (search, book, checkout, owner verify booking)
- [x] Status page is public at `status.tara-stays.com`
- [ ] Founder support WhatsApp number is pinned in owner dashboard
- [x] Audit log table exists and is being written to
- [x] Risk register reviewed; top 5 risks have mitigations in place
- [ ] You've personally visited every onboarded property at least once

### Before Phase B → Phase C (public listings + take rate begins)

- [ ] DTI business name registration completed (sole prop initially, OPC later)
- [ ] BIR registration + Authority to Print receipts set up
- [ ] PH-based lawyer reviewed T&C, Privacy, Owner Agreement, Dispute policy (~₱15-30k)
- [ ] PH-based accountant briefed on the marketplace model (~₱2-5k consultation)
- [ ] VAT registration considered (mandatory at ₱3M revenue; voluntary below)
- [ ] Withholding tax obligations on owner payouts clarified
- [ ] Stripe Connect on production keys (not test)
- [ ] Production environment has separate Cloudflare account / separate Sentry project / separate everything
- [ ] Cancellation policy is clear in product UI + T&C + matches Stripe's refund timing
- [ ] Dispute resolution policy documented and linked from every booking
- [ ] Trust & safety verification system live (property badges working)
- [ ] Owner onboarding self-service flow tested by a non-friend (real stranger feedback)
- [ ] First 10 paid bookings successfully processed without intervention
- [ ] Customer support workflow defined (SLAs, escalation path, response templates)
- [ ] Refund / chargeback playbook written
- [ ] Phase B postmortem written (what worked, what didn't, what changes for Phase C)

### Before Phase C → Phase D (subscription tiers + channel manager)

- [ ] At least 50 active properties OR ~$5k MRR equivalent
- [ ] Channel manager partner selected (Hostaway / SiteMinder / build) — see ADR
- [ ] Tiered pricing tested with existing owners (will they pay? what tier?)
- [ ] OPC (One-Person Corporation) consideration if revenue > ₱500k/year
- [ ] Insurance: professional liability + cyber + maybe property
- [ ] Support team plan (when to hire, what role)

---

## 🔁 Recurring checks

### Weekly (Friday afternoon, ~30 min)

- [ ] Run pnpm test, verify CI is green
- [ ] Review last 7 days of bookings — any patterns or anomalies?
- [ ] Read all CodeRabbit comments from the week — anything I dismissed that I should reconsider?
- [ ] Read all customer-support touch points (email, WhatsApp, Tawk.to) — themes?
- [ ] Publish 1 SEO article (or stage for next week)
- [ ] Post weekly LinkedIn / Twitter update (building-in-public ritual)
- [ ] Weekly review: what shipped, what learned, what's next week's #1 priority

### Monthly (first weekday of month, ~2 hours)

- [ ] Restore drill: spin up fresh container, restore latest backup, verify app boots and bookings come back
- [ ] Review notification audit log — any delivery failures or unusual patterns?
- [ ] Review Renovate PRs for security updates (merge minor/patch after CI passes)
- [ ] Check uptime + performance metrics (Lighthouse, Core Web Vitals, Grafana)
- [ ] Cost review: any free-tier limits being approached?
- [ ] Content calendar review: are we on cadence?
- [ ] Personal energy check: am I sustainable?

### Quarterly (first weekday of new quarter, ~half day)

- [ ] Risk register review — any new risks emerged? Probabilities/impacts changed?
- [ ] Phase progress assessment — are the graduation gates closer? what's blocking?
- [ ] Roadmap review — are we still building the right things?
- [ ] Architecture audit — any modules drifting, any tech debt accumulating dangerously?
- [ ] Customer interview synthesis — top 5 themes from interviews this quarter?
- [ ] Burnout check — sustainable pace? rest enough? joy still present?
- [ ] Update ADRs index — any decisions superseded?

### Annually (start of new year, ~1 day)

- [ ] Major dependency upgrades (Node, Postgres, Next.js, NestJS) — plan and schedule
- [ ] Architecture review — is the modular monolith still serving us, or extracting time?
- [ ] Domain + service renewals (`tara-stays.com`, Stripe, etc.)
- [ ] BIR annual return (Q1 deadline; work with accountant)
- [ ] Business registration renewals
- [ ] Stripe account review (rate negotiation possible at volume)
- [ ] Backup strategy review (storage costs, retention policies)
- [ ] Goals retrospective + next year priorities

---

## 🧯 Incident-time reminders

When things break:

- [ ] Check `docs/runbooks/incident-response.md` (TBD)
- [ ] Update status page within 5 min of detection
- [ ] Post-incident: write a postmortem within 48h (template in runbooks)

---

## 🧠 Personal reminders (not project-y but matters)

- [ ] Take real days off (not just hours). Travel without your laptop occasionally.
- [ ] You are not your project. Bad week ≠ bad founder.
- [ ] Talk to other founders monthly (peer support is rare and valuable).
- [ ] Save money during good months. Solo founder cashflow is bumpy.
- [ ] Keep a non-coding hobby (surfing? music? running?). Identity diversification matters.
