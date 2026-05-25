# Affiliate / Partner Program

How vloggers, bloggers, influencers, and travel content creators earn from driving bookings to Tara. **Distinct from** guest-to-guest referral codes (those are in [`09-discounts-and-promotions.md`](../domain/09-discounts-and-promotions.md)).

> Related: [`09-discounts-and-promotions.md`](../domain/09-discounts-and-promotions.md) (promotion infrastructure reused), [`analytics.md`](../architecture/analytics.md) (attribution tracking), [`content_strategy`](../../../C--Users-alexi/memory/content_strategy.md) (founder's own content).

This is **a multi-year build with a clear ROI** — but specifically a **Phase C+ feature**. Phase A-B: trades only (free stays for content). Phase C: structured program. Phase D+: scale.

---

## Two distinct programs (don't conflate)

| Program                                                          | Audience                               | Mechanic                      | Reward                        |
| ---------------------------------------------------------------- | -------------------------------------- | ----------------------------- | ----------------------------- |
| **Guest referral** (covered in `09-discounts-and-promotions.md`) | Past guests                            | Personal code, friends use it | Both get ₱300 credit          |
| **Affiliate / Creator partner** (THIS DOC)                       | Travel vloggers, bloggers, influencers | Tracked link or unique code   | Commission per booking driven |

Different audiences, different attribution mechanics, different payouts, different legal status.

---

## Why this matters for Tara

PH travel discovery is **creator-driven.** Backpackers don't search "best hostel Zambales" first — they watch a TikTok, see a vlogger sleeping in a beach cottage, then they search.

Currently, every PH travel creator points their audience to **Booking.com or Hostelworld** (because those have affiliate programs). Even when their content features a Tara property, the booking goes through OTA.

**This is leakage that we can fix.** Every TikTok mentioning a Tara property without our affiliate program = a booking we lost commission on.

Estimated leak in Phase C+: ~20-30% of organic discovery. Worth the program design.

---

## Three tiers

Different creator-relationship intensities warrant different mechanics.

### Tier 1 — Trade (Phase A-B only — no money exchanged)

**For:** small-to-mid creators (5k-50k followers), found via DMs.

**What they get:** 1-3 nights free at a partner property + optional tour comp.

**What we get:** 1-3 pieces of content (a TikTok, an IG reel, an IG story, or a blog post).

**Mechanism:** founder personally arranges. Owner gets reimbursed via Tara credit OR contributes the bed (their marketing budget). Tracked in a Notion table — no system needed.

**Why this scales poorly:** founder time per creator is hours; only ~20-30/year possible. But these are the easiest first wins.

### Tier 2 — Micro-affiliate (Phase C — money + scale)

**For:** active creators with proven travel audience (10k-100k followers, 50+ trips of content).

**What they get:**

- Unique tracking link: `tara-stays.com/?aff=MARIATRAVELS`
- 5% commission on any booking attributed to their link (90-day attribution window)
- Real-time dashboard showing their earnings + clicks
- Monthly payout via GCash or bank (Stripe Connect for the creator side)

**Self-serve to apply:** form, brief audit (do they actually post travel content?), founder approves within 48h.

**Why 5%:** half of Tara's typical 10% commission. Sustainable margin. Industry norm is 3-8%.

**Volume target:** Phase C launch: 20 active affiliates. Phase D: 100+.

### Tier 3 — Partner (Phase D+ — bespoke deals)

**For:** large creators (100k+ followers) OR media properties (travel blogs with 50k+ monthly readers) OR travel agencies.

**What they get:**

- Negotiated terms (custom commission %, flat fees, content collabs, paid placements)
- Direct relationship with founder/ops team
- Sometimes: exclusive promo codes for their audience (better discount than regular promos)
- Sometimes: co-branded landing pages

**Mechanism:** custom contracts. Founder handles personally Phase D; growth/ops person Phase E.

**Volume target:** ~10 strategic partners by year 3.

---

## How attribution works (technical)

Reuses the promotion infrastructure from [`09-discounts-and-promotions.md`](../domain/09-discounts-and-promotions.md) + adds new tables.

### Tracking links

```
https://tara-stays.com/?aff=MARIATRAVELS                 (general)
https://tara-stays.com/en/zambales/?aff=MARIATRAVELS     (deep link)
https://tara-stays.com/en/properties/marias-surf-hostel/?aff=MARIATRAVELS
```

When a user lands with `?aff=<code>`:

1. Server reads cookie + URL param
2. Set first-party cookie `tara_aff=MARIATRAVELS` (90-day expiry)
3. On booking_confirmed, record `affiliate_code` in `bookings` table
4. Commission accrues to that affiliate

### Data model additions

```sql
CREATE TABLE affiliates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id),
  code            text UNIQUE NOT NULL,          -- MARIATRAVELS
  display_name    text NOT NULL,
  channel_url     text,                          -- their TikTok / blog
  channel_type    text,                          -- 'tiktok' | 'instagram' | 'youtube' | 'blog' | 'other'
  follower_count  int,                           -- snapshot at signup; updated quarterly
  tier            text NOT NULL,                 -- 'trade' | 'micro' | 'partner'
  commission_pct  int NOT NULL DEFAULT 500,      -- basis points (500 = 5%)
  payout_method   text,                          -- 'stripe_connect' | 'gcash' | 'bank'
  payout_details  jsonb,
  status          text NOT NULL DEFAULT 'active',-- 'active' | 'paused' | 'banned'
  approved_by_user_id uuid REFERENCES users(id),
  created_at, updated_at, deleted_at
);

CREATE TABLE affiliate_clicks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid NOT NULL REFERENCES affiliates(id),
  landing_path    text,                          -- /en/zambales etc.
  user_id         uuid,                          -- if known
  anon_id         text,                          -- before signup
  ip_country      text,
  referrer        text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_clicks_aff_date_idx ON affiliate_clicks(affiliate_id, created_at);

CREATE TABLE affiliate_attributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id),
  affiliate_id    uuid NOT NULL REFERENCES affiliates(id),
  click_id        uuid REFERENCES affiliate_clicks(id),
  attributed_at   timestamptz NOT NULL DEFAULT now(),
  commission_minor int NOT NULL,
  currency        text NOT NULL,
  payout_status   text NOT NULL DEFAULT 'pending',-- 'pending' | 'paid' | 'clawed_back' | 'voided'
  payout_id       uuid REFERENCES affiliate_payouts(id),
  computation_jsonb jsonb,                       -- audit: which booking, what booking total, what %
  UNIQUE (booking_id)                            -- one affiliate per booking max
);

CREATE TABLE affiliate_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid NOT NULL REFERENCES affiliates(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  total_minor     int NOT NULL,
  currency        text NOT NULL,
  status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'paid' | 'failed'
  payout_method   text NOT NULL,
  external_ref    text,                          -- Stripe transfer ID, etc.
  paid_at         timestamptz,
  notes           text
);

-- On bookings table
ALTER TABLE bookings ADD COLUMN affiliate_code text;     -- denormalized, set at booking time
ALTER TABLE bookings ADD COLUMN affiliate_click_id uuid; -- for attribution
```

### Attribution rules (lock these down)

- **Window:** 90-day cookie. If guest clicks affiliate link, then books within 90 days, affiliate gets credit.
- **Last-click attribution.** If guest clicks multiple affiliate links, the last one within window wins. (Industry standard; simpler than multi-touch.)
- **Cookie + login-bound.** If guest logs in after clicking, attribution transfers to their user record (survives device switch).
- **One affiliate per booking.** No splits. (Phase E might revisit for multi-touch.)
- **Commission base:** Tara's net commission on the booking, NOT the full booking total. So if booking is ₱5,000 and Tara's commission is ₱500 (10%), affiliate gets 50% of that = ₱250.
- **Excluded:** self-referrals (affiliate booking their own link). Detected via user_id match.
- **Refund clawback:** if booking is refunded > 50%, affiliate commission is clawed back (deducted from next payout).

### Payout cadence

- **Phase C:** monthly, on the 5th, for prior month
- **Minimum payout:** ₱500 (smaller balances roll over)
- **Payout methods:** GCash (cheap, fast), Maya, bank transfer, Stripe Connect (for international)
- **Statement:** affiliates see clicks → conversions → commissions in their dashboard, exportable to CSV

---

## Affiliate dashboard

A scaled-down owner dashboard for affiliates. Lives at `/affiliate` (separate from `/admin` which is for property owners).

```
/affiliate (logged in as affiliate)
│
├── 📊 Dashboard
│       Clicks this month / total
│       Bookings driven this month / total
│       Commission earned (pending / paid)
│       Conversion rate %
│
├── 🔗 My Links
│       Generate tracking links (general / by region / by property)
│       Copy link button
│       QR code generator (for IG stories)
│
├── 💸 Earnings
│       Per-booking breakdown (which click → which booking)
│       Payout history
│       Tax / receipt info
│
├── 📝 Content guidelines
│       Brand assets (logo, screenshots)
│       Honest marketing rules
│       FTC-style disclosure requirements (we recommend they say "affiliate link")
│
└── ⚙️ Settings
        Payout method
        Profile + channel info
```

UI is simpler than owner dashboard (fewer screens, no inventory management). Built reusing the same component library.

---

## Anti-fraud

Affiliates exploit programs in known ways. Tara protects against:

| Fraud pattern                                                             | Detection                                                           | Action                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Cookie stuffing (loading affiliate cookie on pages without their content) | Click pattern: many clicks from one IP, no landing page interaction | Auto-flag if click-to-impression ratio is wildly off |
| Self-bookings                                                             | user_id match                                                       | Reject attribution; ban on repeat                    |
| Booking + cancel to game commissions                                      | Refund clawback rule                                                | Built-in to commission accounting                    |
| Created-and-cancelled accounts (fake bookings)                            | Pattern: new accounts only booking through this affiliate           | Manual review                                        |
| Bot traffic                                                               | User-agent filtering + impossible-conversion-velocity detection     | Block + ban                                          |
| Click farm (cheap clicks but no conversions)                              | Conversion < 0.1% on >1000 clicks                                   | Auto-pause for review                                |
| Misleading content ("free Tara stays!")                                   | Content monitoring (Phase D) + user reports                         | Suspend; demand correction                           |
| Coordinating discount codes with affiliate codes for double benefit       | Schema: can't stack guest promo + affiliate-as-discount             | Enforced in pricing engine                           |

Phase B-C: founder reviews flagged affiliates manually. Phase D+: dedicated trust ops.

---

## Legal + compliance

### PH Consumer protection

- Affiliates must disclose affiliate relationships per Philippine Advertising Standards Council guidelines
- Tara's affiliate agreement includes "you will disclose this relationship in any content promoting Tara"
- We provide #ad / #affiliate template language in the dashboard

### Tax implications

- Affiliate commissions are **business income for the affiliate** (BIR reportable in PH)
- Tara issues year-end statements (Phase C+) showing total earnings
- Withholding tax may apply (consult PH accountant — task #26 covers this)
- International affiliates: pay in their currency via Stripe Connect; they handle their local tax

### Affiliate Agreement (Phase C launch)

A standard click-through agreement covering:

- Commission structure + payment terms
- Attribution rules (last click, 90-day window)
- Cookie usage disclosure
- Termination clauses (we can suspend for fraud/abuse)
- IP rights (they own their content; we use it for testimonials with permission)
- Indemnification (they don't misrepresent Tara)

Lawyer reviewed (per task #25 legal docs).

---

## Phase rollout

### Phase A (Months 0-6) — nothing yet

- Founder writes the playbook (this doc)
- No affiliates onboarded; not enough product to send people to

### Phase B (Months 6-12) — Trade tier only

- ~10 small creators onboarded via DM
- Each does 1 piece of content for a free stay (no money exchanges hands)
- Mechanism: hand-tracked in Notion; no UI yet
- Goal: learn what content actually drives bookings; build creator relationships

### Phase C launch (Months 12-15) — Micro-affiliate live

- Public application form opens
- Affiliate dashboard built
- 90-day cookie tracking live
- Monthly payout flow tested with 5-10 initial affiliates
- Goal: 20 active micro-affiliates by month 18

### Phase C+ (Months 15-24) — Scale

- 50-100 active micro-affiliates
- First Partner-tier deals (1-3 negotiated relationships)
- A/B testing of commission rates (does 7% drive 1.5x more affiliates than 5%?)
- Goal: 15-25% of new bookings attributed to affiliates

### Phase D+ (Year 2-3) — Mature program

- Partner team handles top relationships
- API for partners to integrate (Phase E if demand)
- Multi-region affiliate (international travel bloggers)
- Goal: 30%+ of bookings attributed; meaningful contribution to growth

---

## Founder discipline (the most important section)

**The single biggest risk: over-investing in affiliates before product-market fit.**

If TTFV is poor, if reviews are bad, if owners are churning — sending more traffic via affiliates **accelerates the brand damage**.

Rule: don't open the public affiliate application until:

- ≥ 20 active properties
- ≥ 100 completed bookings on the platform
- Average rating ≥ 4.5
- Repeat booking rate ≥ 15%
- Self-service owner onboarding completion ≥ 20%

Before those gates, only Phase B trade-tier (founder-arranged 1:1).

---

## Marketing the program (Phase C)

When ready to launch:

1. **Landing page** at `/become-an-affiliate` — clean, transparent, "join the early creators making Tara grow"
2. **Founder blog post** — "Why we built an affiliate program (and what we learned not to do)"
3. **Targeted DMs** to known PH travel creators (the same ones from Phase B trades — they're warm)
4. **No paid acquisition for affiliates.** Affiliates who join because of money rarely produce. Affiliates who join because they believe in Tara are the ones who matter.

---

## Honest expectations

| Phase           | Bookings driven by affiliates | Commission paid out |
| --------------- | ----------------------------- | ------------------- |
| B (trades only) | < 5% (untrackable)            | ₱0 (in-kind only)   |
| C launch        | 5-10%                         | ₱5-20k / mo         |
| C end           | 15-20%                        | ₱50-100k / mo       |
| D               | 20-30%                        | scales with revenue |

If affiliates are driving > 40% of bookings, something else is broken (organic is too weak, or the program is over-rewarding bad behavior). Aim for healthy 20-30%.

---

## What we deliberately don't do

| Tactic                                     | Why not                                       |
| ------------------------------------------ | --------------------------------------------- |
| Multi-level marketing / network marketing  | Predatory; brand poison                       |
| Recruit-affiliates-to-recruit-affiliates   | Same                                          |
| Promise inflated earnings                  | Trust killer; legally risky in PH             |
| Pay affiliates upfront before they produce | Adverse selection; only fraud profits         |
| Exclusive territories                      | Antitrust concern; bad UX                     |
| Punish low-volume affiliates               | A 2-bookings-a-year creator is still valuable |
| Manual override of attribution             | Trust killer; let the cookies decide          |
| Cap total payouts annually                 | If they earn it, they get it                  |

---

## When this doc changes

- New tier added or restructured → update tier table
- Commission rate change → migration + grandfather existing affiliates at old rate for 90 days
- Fraud pattern observed → add to detection table
- New jurisdiction (international affiliates) → tax/legal section needs revision
