# Risk Register

What could kill or seriously damage Tara. **A risk register is not paranoia — it's preparation.** Identify the threats, score them honestly, plan mitigations for the top ones.

> **Review cadence:** quarterly (see [`docs/founder/checklist.md`](../founder/checklist.md)). Add new risks as they emerge; demote risks that resolve.

## How to read this

Each risk has:

- **Probability** (Low / Medium / High): how likely over the next 12 months
- **Impact** (Low / Medium / High / Critical): consequence if it happens
- **Score** = Probability × Impact, color-coded
- **Mitigation:** what we do to reduce probability or impact
- **Owner:** who watches for it (currently all you, future: ops/legal/etc)

🔴 Critical (must mitigate) · 🟡 Watch (monitor) · 🟢 Acceptable (do nothing unless escalates)

---

## Market risks

| #   | Risk                                                                    | P      | I        | Score | Mitigation                                                                                                         |
| --- | ----------------------------------------------------------------------- | ------ | -------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| M-1 | Hostelworld launches aggressive PH push, cuts commissions to match Tara | Low    | High     | 🟡    | Wedge on local presence + Zambales-first + tour bundling. Brand "by a Filipino, for Filipinos" is hard to copy.    |
| M-2 | Klook expands into accommodation properly                               | Medium | High     | 🔴    | Move fast on supply; sign exclusivity-friendly partnerships early; differentiate on UX + cancellation flexibility. |
| M-3 | Booking.com pushes harder on hostels (currently weak there)             | Low    | Medium   | 🟢    | Local sales > algorithmic discovery. We can outhustle them at the city level.                                      |
| M-4 | PH tourism downturn (typhoon season disaster, geopolitical, pandemic)   | Medium | Critical | 🔴    | Domestic-traveler focus is more resilient than international. Diversify regions (Phase D). Keep burn low.          |
| M-5 | Travel macro shifts (digital nomad bust, etc.)                          | Low    | Medium   | 🟢    | Hostels serve diverse travelers; not over-indexed on one segment.                                                  |
| M-6 | Zambales-specific competitor (local startup) emerges                    | Low    | Medium   | 🟡    | Be the dominant platform before they exist. First-mover + supply lock-in.                                          |

---

## Regulatory risks

| #   | Risk                                                                                    | P      | I        | Score | Mitigation                                                                                   |
| --- | --------------------------------------------------------------------------------------- | ------ | -------- | ----- | -------------------------------------------------------------------------------------------- |
| R-1 | BIR audit determines we owe back taxes                                                  | Low    | High     | 🟡    | Register early (Phase C gate). Use accountant. Document all revenue.                         |
| R-2 | Data Privacy Act (RA 10173) violation (e.g., breach without notification)               | Low    | Critical | 🔴    | Audit log, breach response runbook (`#27`), DPO designated (founder). 72h notification SLA.  |
| R-3 | LGU tourism licensing changes (e.g., Zambales requires platform to verify all listings) | Medium | Medium   | 🟡    | Maintain good relationships with local tourism office. Verification badges already in place. |
| R-4 | DTI / SEC require business registration we hadn't done                                  | High   | Low      | 🟡    | Phase C gate explicitly includes DTI. Schedule with accountant before charging real money.   |
| R-5 | Stripe pulls out of PH or changes terms unfavorably                                     | Low    | Critical | 🔴    | PayMongo Connect as fallback (per ADR-0005). Maintain dual support readiness from Phase C.   |
| R-6 | New PH regulation requires foreign worker visas on platform                             | Low    | Low      | 🟢    | Currently not relevant (no foreign workers planned).                                         |
| R-7 | EU GDPR enforcement against us (we serve EU travelers)                                  | Medium | Medium   | 🟡    | T&C compliant (Termly). Data export/delete features. Cookie consent.                         |

---

## Technical risks

| #   | Risk                                                  | P      | I        | Score | Mitigation                                                                                          |
| --- | ----------------------------------------------------- | ------ | -------- | ----- | --------------------------------------------------------------------------------------------------- |
| T-1 | Double-booking bug despite all our defenses           | Low    | Critical | 🔴    | Four-layer defense (ADR + `06-concurrency.md`). Tests run on every commit. Alerts on Layer-3 fires. |
| T-2 | Stripe webhook drops cause inconsistent payment state | Medium | High     | 🔴    | Webhook idempotency + replay tool + sweeper jobs reconcile. Monitor delivery rate.                  |
| T-3 | Home server hardware fails (disk, RAM, power supply)  | Medium | High     | 🔴    | UPS, ZFS mirror (planned), daily backup to B2, hot-standby VPS Phase C. RTO 4h target.              |
| T-4 | ISP outage extended (>24h)                            | Medium | High     | 🟡    | 4G failover (planned). Move prod to cloud at Phase C anyway.                                        |
| T-5 | Critical npm dep abandoned / hijacked                 | Medium | Medium   | 🟡    | Renovate watches updates. Lockfile committed. Security scanning.                                    |
| T-6 | Database corruption (rare but catastrophic)           | Low    | Critical | 🔴    | pgBackRest continuous WAL backup. Monthly restore drills. Point-in-time recovery.                   |
| T-7 | Cloudflare degraded (rare but happens)                | Low    | Medium   | 🟡    | Static site can degrade gracefully. R2 has fallback DNS. Accept brief outages.                      |
| T-8 | AI provider (Ollama/Claude) becomes unreliable        | Low    | Low      | 🟢    | All AI features have non-AI fallbacks. Never on critical path.                                      |

---

## Operational risks

| #   | Risk                                                         | P      | I        | Score | Mitigation                                                                                         |
| --- | ------------------------------------------------------------ | ------ | -------- | ----- | -------------------------------------------------------------------------------------------------- |
| O-1 | Founder burnout in months 6-12                               | High   | Critical | 🔴    | Calendar discipline. Hobbies. Vacation. See `docs/founder/operations.md`. Quarterly burnout check. |
| O-2 | Founder gets sick for 2+ weeks                               | Medium | High     | 🔴    | Documented runbooks; minimum-viable maintenance mode. No SPOF features.                            |
| O-3 | Owner unresponsive during dispute → guest complains publicly | Medium | Medium   | 🟡    | 24/48h SLA + auto-escalation. Public response from Tara within hours.                              |
| O-4 | Manual mode disputes overwhelm founder                       | High   | Medium   | 🔴    | Push owners to Stripe mode quickly. Limit manual mode by Phase C. Templates for common disputes.   |
| O-5 | First viral negative review damages early reputation         | Medium | High     | 🔴    | Trust & Safety doc designed for this. Rapid response (<2h). Honest engagement, not corporate.      |
| O-6 | Tax/accounting mess from informal owner payouts              | Medium | Medium   | 🟡    | Accountant briefed Phase C. All payouts via Stripe = traceable.                                    |

---

## Reputational risks

| #    | Risk                                                             | P      | I        | Score | Mitigation                                                                                                                   |
| ---- | ---------------------------------------------------------------- | ------ | -------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| RP-1 | Guest safety incident at a Tara-listed property                  | Low    | Critical | 🔴    | Verification badges. Owner agreement requires safety standards. Insurance partnership Phase D. Crisis communication runbook. |
| RP-2 | Fake review scandal goes public                                  | Low    | High     | 🔴    | Only verified-booking reviews. Pattern detection. Public commitment in Trust Promise.                                        |
| RP-3 | Trust Promise broken visibly (e.g., we don't refund as promised) | Medium | High     | 🔴    | Founder personally watches first 100 disputes. Bias toward generous refunds Phase B.                                         |
| RP-4 | Founder personal misstep damages brand (build-in-public risk)    | Low    | High     | 🟡    | Personal social = personal; never tweet about politics on brand channels. Separate accounts.                                 |
| RP-5 | Owner-side scandal (one property runs a scam)                    | Medium | High     | 🔴    | Verification + immediate delisting + refund affected guests + public statement. Get ahead of the story.                      |

---

## Personal / financial risks

| #   | Risk                                                        | P      | I        | Score | Mitigation                                                                                                         |
| --- | ----------------------------------------------------------- | ------ | -------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| P-1 | Solo founder financial pressure forces returning to day job | Medium | Critical | 🔴    | Multi-year build is the plan. Day job is acceptable; maintenance mode supports it. Frugal infra.                   |
| P-2 | Health issue affects ability to work                        | Low    | Critical | 🔴    | Insurance. Savings. Documented runbooks. Pause-and-resume plan.                                                    |
| P-3 | Family circumstance change (relocation, caregiving)         | Medium | High     | 🟡    | Tara runs on home server but accessible from anywhere via VPN. Cloud migration plan Phase C if relocation needed.  |
| P-4 | Loss of motivation / boredom (real solo dev risk)           | Medium | High     | 🟡    | Customer interviews quarterly to re-ground in real problem. Variety in work (code days, content days, sales days). |

---

## Risk score summary

| Tier          | Count | Most pressing                                                                                   |
| ------------- | ----- | ----------------------------------------------------------------------------------------------- |
| 🔴 Critical   | 14    | O-1 founder burnout · T-1/T-6 data integrity · M-2 Klook competition · O-4 manual mode disputes |
| 🟡 Watch      | 11    | Various                                                                                         |
| 🟢 Acceptable | 4     | M-3, M-5, R-6, T-8                                                                              |

**14 critical risks** is a lot. Don't be alarmed — every startup has this many. The point isn't to eliminate risk; it's to be **awake** to them so when they materialize you respond fast.

---

## Top 5 to actually prepare for

If you only do work on 5 mitigations this quarter:

1. **O-1 founder burnout** — write `docs/founder/operations.md` (the discipline doc). Calendar a vacation now.
2. **T-6 database corruption** — set up pgBackRest + run a restore drill before any real customer (#27).
3. **R-2 data privacy** — T&C from Termly (#25) + audit log + 72h breach response runbook.
4. **O-4 manual mode disputes** — limit manual mode adoption; push Stripe onboarding hard.
5. **M-2 Klook competition** — lock in Zambales supply before they care about the PH hostel segment.

---

## Things we considered but excluded

- **"Anthropic / OpenAI changes API pricing"** → covered by Ollama-first strategy. Not a risk.
- **"GitHub goes down"** → fork/clone exists everywhere. Not material.
- **"Asteroid hits Earth"** → can't mitigate. Skip.

---

## When this doc changes

- Quarterly review: re-score each risk, add new ones, drop resolved ones
- After any incident: did we predict it? If not, add it; if so, update probability
- When entering a new phase: re-evaluate from that phase's perspective
- Major regulatory or competitive change: emergency revision
