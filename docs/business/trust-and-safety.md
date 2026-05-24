# Trust & Safety

How Tara builds and maintains trust between guests, owners, and the platform. **Marketplaces live or die on trust.** A single high-profile incident can erase years of brand building.

> Touches: [ADR-0004](../adr/0004-payment-architecture.md) (payment trust), [ADR-0005](../adr/0005-payment-modes-per-property.md) (manual mode dispute risk), [`04-booking-lifecycle.md`](../domain/04-booking-lifecycle.md) (Disputed state), [`image-pipeline.md`](../architecture/image-pipeline.md) (photo fraud detection).

This doc covers verification, badges, fraud patterns, dispute resolution, suspension policies, appeals.

---

## The trust equation

> Guests trust Tara → Tara has verified the owner → Owner delivers → Guest leaves review → More guests trust.

Break any link in this chain and the marketplace dies. Specifically:

| Failure                                             | Consequence                                  |
| --------------------------------------------------- | -------------------------------------------- |
| Guest arrives, property doesn't exist               | Refund + brand damage + viral horror story   |
| Guest arrives, property far worse than photos       | Refund + 1-star review + churn               |
| Owner doesn't get paid as promised                  | Owner leaves + warns peers + supply dries up |
| Tara takes side of obviously-wrong party in dispute | Loses the other side's trust permanently     |
| Fake reviews / inflated ratings                     | Long-term brand erosion; impossible to undo  |

This doc designs around each.

---

## Verification levels — properties

Every property has a verification badge visible to guests.

| Level                | Badge               | What we verify                                           | When                                                                  |
| -------------------- | ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| 0 — Unverified       | (no badge)          | Email + phone of owner only                              | On signup                                                             |
| 1 — Listing verified | ✓ Listing           | Property exists, photos are real, address is correct     | Phase B: founder visits OR Phase C+: documents + reverse image search |
| 2 — Owner verified   | ✓ Owner             | Owner identity (gov ID) matches person on record         | Stripe Connect KYC OR Phase B founder confirms                        |
| 3 — Stripe verified  | ✓ Payment           | Owner has completed Stripe Connect, can receive payments | `stripe_onboarding_status = 'active'`                                 |
| 4 — Local verified   | ★ Local Recommended | Tara has stayed there (founder or trusted reviewer)      | Phase B only — founder personally vouches                             |

**UI:** badges appear inline with property name. Tooltip on hover explains what was verified.

**Marketplace baseline:** every published property must be at minimum **Level 1** (Listing verified). No anonymous publishing.

### Phase-by-phase verification effort

| Phase            | What founder does                                     | Process                                                 |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| A (Months 0-6)   | Founder is the only owner OR friend properties        | Trivially verified                                      |
| B (Months 6-12)  | Founder physically visits each new property           | 1-2 hr visit per property; photos, badge, manual unlock |
| C (Months 12-24) | Mix: high-touch for premium, self-service with checks | Documents + reverse image search + spot checks          |
| D+               | Verification team (1-2 ops people) + AI-assisted      | Documented playbook                                     |

### Self-service verification (Phase C+)

Owner submits:

- 1 utility bill or lease showing the address
- Government ID matching the name on file
- Selfie holding ID (anti-fraud)
- Property photos with date-stamped metadata (we strip the metadata for display but check it for verification)

Tara ops reviews within 48h. Approve → unlock Level 1 badge.

---

## Verification levels — guests

Less strict than owners (guests don't get paid; they pay).

| Level                | When                                   | Used for                                    |
| -------------------- | -------------------------------------- | ------------------------------------------- |
| Email verified       | On signup                              | Required to book                            |
| Phone verified (SMS) | Required for first booking             | Anti-spam                                   |
| ID verified          | Optional, gives "Verified Guest" badge | Some owners require it for private bookings |

**Why we don't require government ID for all guests:** would kill conversion. The booking itself + payment IS the proof of intent.

**Some bookings may require ID:** owner can opt in (especially for higher-value private rooms). Guest is told upfront.

---

## Trust signals on listings

Beyond the verification badge, the listing page shows:

```
┌─────────────────────────────────────────────────────────┐
│  Maria's Surf Hostel                ✓ Listing  ✓ Owner  │
│  San Antonio, Zambales                  ★ 4.7 (42 reviews) │
│                                                          │
│  ⚡ Usually responds within 3 hours                       │
│  📅 137 bookings on Tara                                 │
│  🌟 92% of guests recommend                              │
│  📷 28 photos · last updated 8 days ago                  │
│  👤 Hosted by Maria · joined 2024 · always polite        │
└─────────────────────────────────────────────────────────┘
```

Each signal is computable and **non-fakeable**:

- Response time: median over last 30 days
- Booking count: only confirmed + completed bookings count
- Recommendation %: from review survey
- Photo freshness: actual upload dates
- Host info: account age, manual "polite" rating from reviews

These signals matter for owner SEO within Tara's search ranking too.

---

## Fraud patterns we expect and how we catch them

### Owner-side fraud

| Pattern                                                | Detection                                                                     | Action                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Listing a property that doesn't exist                  | Phase B: founder visit. Phase C+: docs + reverse search photos                | Reject listing                             |
| Stock photos from other sites                          | Reverse image search (TinEye / SerpAPI) at upload                             | Flag, manual review                        |
| Photos from a different property (their own or stolen) | Reverse image search across our own DB                                        | Reject duplicate; investigate              |
| Manipulating cancellation policy to keep guest money   | Founder reviews disputes; if pattern → suspend                                | Suspend, refund guests                     |
| Creating fake bookings to fake reviews                 | Detect: same IP/device for booking + review; review without confirmed booking | Auto-flag review, ban actor                |
| Coordinated review fraud (bribing real guests)         | Detect: review patterns (timing, sentiment, language) anomalies               | Flag for manual review                     |
| Off-platform booking after Tara intro                  | Detect: guest contacted via Tara then no booking + 1-star review              | Pattern analysis; suspend repeat offenders |
| Refunding payment then claiming guest no-show          | Manual mode only; founder mediation                                           | Document; ban repeat offenders             |

### Guest-side fraud

| Pattern                                             | Detection                                              | Action                                     |
| --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Chargeback after stay completed                     | Stripe webhook; ID-verify guest history                | Defend the chargeback with check-in proof  |
| Fake booking to lock inventory then cancel          | Detect: high cancellation rate per guest               | Restrict booking ability                   |
| Stolen credit card                                  | Stripe Radar catches most                              | Refund actual cardholder; block the booker |
| Damage to property + denies it                      | Owner reports with photo proof; deposit hold (Phase C) | Mediate; deduct from deposit               |
| Fake / paid-for negative reviews against a property | Linguistic analysis + pattern detection                | Remove review, suspend reviewer            |

### Cross-side fraud

| Pattern                                                   | Detection                                           | Action                                  |
| --------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| Owner + guest collude to fake bookings (money laundering) | Booking patterns: same payment method, no real stay | Flag both, investigate, possibly report |
| Owner asks guest to pay off-platform to avoid commission  | Reported by guest OR caught in chat scan (Phase D)  | Warn, then suspend owner                |

---

## Dispute resolution

The hardest, most reputation-defining work. **Get the framework right; cases follow.**

### Principles

1. **Always read both sides fully before responding.** Don't make snap decisions.
2. **Lean toward refund (favor the guest) when evidence is mixed and amount is small.** Cheaper than a bad review.
3. **Document every decision** in `booking_events` with reasoning.
4. **Pattern-spot:** if same owner has 3+ disputes in 6 months, the owner is the problem.
5. **Be transparent.** Tell both parties the outcome and why.
6. **Never automate disputes.** Always human-judged (founder Phase B; ops Phase D+).

### The 5 most common disputes

**1. "Property didn't match the photos"**

- Guest provides photos at arrival showing the discrepancy
- Owner has 48h to respond
- Outcome: usually 50-100% refund + remove listing if confirmed; if photos legit it's a misunderstanding, partial refund

**2. "Owner cancelled at last minute"**

- Tara enforced policy: owner cancellation = guest gets 100% refund + Tara helps find alternative
- Owner penalty: suspended for 30 days first offense; banned on 2nd
- Why so strict: this is the most brand-damaging incident type

**3. "I never received my refund" (manual mode)**

- Tara mediates between guest and owner
- If owner confirms they refunded (with proof): case closed
- If owner refuses: Tara escalates to delisting (manual mode is owner's risk per ADR-0005)

**4. "Payment processed but booking never confirmed"**

- Edge case from Stripe race conditions (see `04-booking-lifecycle.md`)
- Outcome: refund 100% within 24h; apology email; analyze logs to prevent recurrence

**5. "Negative review is false / unfair"**

- Owner can dispute a review within 14 days
- Tara reviews evidence (booking exists? guest actually stayed? review specific to this booking?)
- Decisions: remove (rare), keep with owner reply, keep without modification (most common)

### Dispute SLAs

| Severity                                 | Response time | Resolution time |
| ---------------------------------------- | ------------- | --------------- |
| Active stay incident (guest at property) | < 2 hours     | < 6 hours       |
| Pre-stay (within 24h of check-in)        | < 4 hours     | < 12 hours      |
| Post-stay refund dispute                 | < 24 hours    | < 7 days        |
| Review dispute                           | < 48 hours    | < 14 days       |

Phase B: founder handles via WhatsApp + email. Phase D+: ops team + ticket system.

---

## Suspension policy

Specifies what gets you suspended and for how long.

### Owner offenses

| Offense                                       | First                      | Repeat                   | Habitual      |
| --------------------------------------------- | -------------------------- | ------------------------ | ------------- |
| Late cancellation by owner                    | 30-day suspension          | Permanent ban            | —             |
| Listing fraud (fake property)                 | Permanent ban              | —                        | —             |
| Stock photos (post-warning)                   | Listing removed            | Permanent ban            | —             |
| Refusing refund per policy                    | Mandatory refund + warning | 30-day suspension        | Ban           |
| Asking guests to pay off-platform             | Warning                    | 30-day suspension        | Permanent ban |
| Chronic unresponsiveness (>48h response time) | Listing demoted in search  | Suspended until improved | —             |
| Hostile communication with guests             | Warning                    | Suspension               | Ban           |

### Guest offenses

| Offense                            | First                                      | Repeat            |
| ---------------------------------- | ------------------------------------------ | ----------------- |
| Chargeback after completed stay    | Account suspended                          | Permanent ban     |
| Fake / coordinated negative review | Review removed + warning                   | Account suspended |
| Property damage + non-payment      | Banned from booking until resolved         | —                 |
| Repeated last-minute cancellations | Booking restricted to non-refundable rates | —                 |
| Hostile communication with owners  | Warning                                    | Suspension        |

### Appeal process

- All suspensions can be appealed in writing
- Founder reviews appeals within 7 days
- Appeal upheld → reinstate with note
- Appeal rejected → final, unless new evidence emerges

---

## What we publicly commit to (in T&C)

A short "Trust & Safety Promise" page, plain language:

```
TARA TRUST PROMISE

For guests:
- If a property is significantly different from its listing,
  we'll help you find a new one + refund the difference.
- If an owner cancels last-minute, full refund + we help find alternative.
- If your booking has a payment issue, we'll fix it within 24h.
- Your messages and payment data are private.

For property owners:
- We'll only suspend or remove your listing for clear policy violations.
- We'll always tell you why and let you appeal.
- Disputes are reviewed by humans, never bots.
- Your photos and content are yours; we use them only to display your listing.

For everyone:
- We don't sell user data.
- We don't manipulate search results to favor paying customers.
- We don't accept undisclosed compensation for ranking.
```

This is the contract. Putting it in writing means we hold ourselves accountable.

---

## Compliance with PH Data Privacy Act (RA 10173)

For trust + legal, we comply with PH data privacy law:

- **Privacy Policy** in plain language (T&C task #25)
- **Data inventory:** what we collect, why, how long we keep it
- **Right to access:** users can export their data via dashboard
- **Right to delete:** soft-delete + scheduled hard-delete (audit log retained for legal minimum 5 years)
- **Data breach notification:** if PII exposed, notify users + NPC (National Privacy Commission) within 72 hours
- **Designated DPO** (Data Protection Officer): founder for Phase B; hire when team grows

This isn't optional — RA 10173 has real penalties. Phase B-C consultation with a PH lawyer covers this.

---

## Phase rollout

| Phase            | Trust mechanics                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| A (Months 0-6)   | Founder is sole owner; trivial verification                                                                     |
| B (Months 6-12)  | Founder visits each property; 4-tier badge system live; manual disputes via WhatsApp                            |
| C (Months 12-24) | Self-service verification with document review; structured dispute ticket system; published trust promise       |
| D+               | Verification ops team; AI-assisted fraud detection; review credibility scoring; possible insurance partnerships |

---

## What we deliberately don't do

| Tactic                                                                          | Why not                                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| "TripAdvisor-style" anonymous host reviews                                      | Encourages drive-by negativity; only verified-booking reviews allowed |
| Allow unverified properties (just "claim later")                                | Defeats trust badge purpose                                           |
| Outsource disputes to a low-cost call center                                    | Cultural + context matters; founder + later trained ops only          |
| Sell or share user contact info with property owners off-platform               | Major trust violation; in T&C as forbidden                            |
| Manipulate search ranking with paid placement (without clear "Sponsored" label) | Long-term brand erosion                                               |
| Allow review removal in exchange for owner upgrade                              | Bribe; never                                                          |
| Display fake "trending" or "X people viewing" signals                           | We can show real signals; never invent                                |

---

## When this doc changes

- New fraud pattern observed → add to detection table
- Suspension policy adjusted → update + grandfather existing cases
- Verification process change → update phase rollout
- T&C / Trust Promise updated → coordinate with legal docs (#25)
