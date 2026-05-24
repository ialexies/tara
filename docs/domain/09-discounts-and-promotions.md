# 09 — Discounts & Promotions

How Tara handles promotions, codes, referrals, and bundles. **Distinct from** the pricing rules in [`03-pricing.md`](03-pricing.md), even though they both reduce the price.

> Read [`03-pricing.md`](03-pricing.md), [`07-money.md`](07-money.md), [`04-booking-lifecycle.md`](04-booking-lifecycle.md) first.

This doc is **mostly a Phase C+ feature**. We design it now so the schema and pricing engine accommodate it; we don't build the full system until promotions become a real marketing lever.

---

## Pricing rules vs. promotions — the crucial distinction

These look similar but are _fundamentally different things_. Conflating them is the source of half the bugs in this space.

| Aspect               | Pricing rule (in `03-pricing.md`)                      | Promotion (this doc)                                  |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| **Who creates it**   | Property owner                                         | Tara platform OR property owner OR bundle author      |
| **When applied**     | Automatically based on conditions (date, length, etc.) | Guest enters a code OR system grants based on profile |
| **Visible to guest** | Reflected in nightly rate, no special UI               | "PROMO APPLIED: -₱X" with code shown                  |
| **Time-bounded**     | Long-running (often years)                             | Campaign-based (week or month)                        |
| **Capped uses**      | No                                                     | Yes: total + per-user                                 |
| **Attribution**      | None                                                   | Critical — which campaign drove this?                 |
| **Stackable**        | Always stacks (within a rate plan)                     | Constrained — usually max 1 promo per booking         |
| **Lives in**         | `pricing_rules` table                                  | `promotions` + `booking_promotions` tables            |

**Mental model:**

- Pricing rules = the owner's nightly rate formula
- Promotions = the platform's marketing overlay on top

A guest sees:

```
Base rate × 3 nights              ₱2,400  ←  pricing engine applies rules here
Subtotal                          ₱2,400
PROMO "BACKPACK20" -20%           -₱480   ←  promotion applies on top of subtotal
Total                             ₱1,920  + ₱60 tax = ₱1,980
```

---

## Types of promotions

### 1. Platform-wide promo code

Most common. Tara runs a campaign: "Use code SURF2026 for 15% off any Zambales hostel."

```
type: 'percent' | 'absolute' | 'free_nights'
value: 1500 (basis points for 15% percent) OR money minor units
applies_to: 'all' | 'region:zambales' | 'category:surf'
max_booking_total_discount_minor: 100000 (cap the discount even on huge bookings)
```

### 2. Owner-specific promo

A single property runs their own sale: "Use code MARIASURF for 20% off at my hostel."

```
property_id: <specific property>
created_by_user_id: <owner>
```

Owner sets these up in their dashboard. Tara takes commission on the discounted total (so owner's discount comes out of the owner's margin, not Tara's).

### 3. First-booking welcome

Auto-applied for new guests on their first booking. No code needed.

```
type: 'absolute', value: 50000  (₱500 off)
requires_first_booking: true
min_booking_minor: 200000  (only for bookings ≥ ₱2,000)
```

### 4. Referral codes

The viral mechanic.

```
type: 'referral_pair'
referrer_user_id: <user who invited>
referee_action: when referee first books → both get ₱300
```

Implementation: each user has a unique `referral_code` (e.g. `MARIA-SURF-K8`). When a guest signs up with someone's code, both users get future-booking credit when the new guest's first booking completes.

### 5. Bundle promo (hostel + tour)

The competitive moat from [`05-tours.md`](05-tours.md). Book accommodation AND an activity in the same checkout → 10% off the bundle.

```
type: 'bundle'
requires_accommodation: true
requires_activity: true
discount_basis: 'total' (applies to combined total)
value: 1000 (10%)
```

Automatic — no code needed. Surfaces in the UI: "Add this tour and save 10% on both."

### 6. Loyalty / repeat-booker

Phase D+ feature. "Your 5th booking → 1 night free."

```
type: 'free_nights'
value: 1
qualifies_after: 4 completed_bookings
```

### 7. Group discount

Owner-controlled. Booking N+ beds/rooms at once → discount.

```
type: 'percent'
value: 1000  (10%)
min_units: 4  (beds in one booking)
```

This can also be a pricing rule (`occupancy` type extended). Either model works; promotion model gives the guest visible "GROUP DEAL" badge.

### 8. Currency-specific (Phase D+)

"USD-paying guests get 5% off as FX uncertainty hedge." Niche; design for it later.

---

## The data model

```sql
CREATE TABLE promotions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text,                    -- null for platform-wide
  code            text,                    -- nullable for auto-applied (welcome, bundle, referral)
  name            text NOT NULL,           -- internal label "Surf Season 2026"
  description     text,                    -- guest-facing copy

  type            text NOT NULL,           -- 'percent' | 'absolute' | 'free_nights' | 'referral_pair' | 'bundle'
  value_minor     int,                     -- minor units (for absolute) OR basis points (for percent)

  -- Scope
  scope           text NOT NULL,           -- 'platform' | 'region' | 'property' | 'owner' | 'category'
  scope_value     text,                    -- e.g., 'zambales', '<property_id>'
  property_id     uuid REFERENCES properties(id),
  owner_id        uuid REFERENCES owners(id),
  applies_to      text[] DEFAULT '{}',     -- e.g., ['accommodation'] | ['tour'] | ['accommodation','tour']

  -- Conditions
  min_booking_total_minor int,             -- only apply if subtotal >=
  max_discount_minor      int,             -- cap the discount amount
  min_nights              int,
  min_units               int,
  requires_first_booking  bool DEFAULT false,
  required_categories     text[],          -- e.g., ['surf'] activity type

  -- Time window
  starts_at       timestamptz,
  ends_at         timestamptz,

  -- Usage caps
  max_uses_total      int,                 -- null = unlimited
  max_uses_per_user   int DEFAULT 1,
  current_uses        int NOT NULL DEFAULT 0,

  -- Stacking
  is_stackable        bool NOT NULL DEFAULT false,
  stacks_with_codes   text[],              -- explicit allowlist if stackable

  -- Status
  status              text NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'expired' | 'exhausted'

  -- Audit
  created_by_user_id  uuid NOT NULL REFERENCES users(id),
  created_at, updated_at, deleted_at,

  UNIQUE (code) WHERE code IS NOT NULL AND status != 'expired'  -- codes unique while active
);

CREATE INDEX promotions_code_active_idx ON promotions(code) WHERE status = 'active' AND code IS NOT NULL;
CREATE INDEX promotions_property_idx ON promotions(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX promotions_active_window_idx ON promotions(starts_at, ends_at) WHERE status = 'active';


CREATE TABLE booking_promotions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid NOT NULL REFERENCES bookings(id),
  promotion_id        uuid NOT NULL REFERENCES promotions(id),
  tenant_id           text,
  applied_at          timestamptz NOT NULL DEFAULT now(),
  discount_minor      int NOT NULL,        -- the actual discount applied
  currency            text NOT NULL,
  computation_details jsonb,               -- audit: which rule fired, base value, formula

  UNIQUE (booking_id, promotion_id)         -- can't apply same promo twice
);

CREATE INDEX booking_promotions_booking_idx ON booking_promotions(booking_id);
CREATE INDEX booking_promotions_promotion_idx ON booking_promotions(promotion_id);


-- On bookings table — added columns
ALTER TABLE bookings ADD COLUMN promo_code_used text;         -- denormalized, for fast filters
ALTER TABLE bookings ADD COLUMN referrer_user_id uuid REFERENCES users(id);  -- who referred this booker, if any
ALTER TABLE bookings ADD COLUMN attribution_source text;       -- 'organic' | 'referral' | 'campaign:<id>' | 'paid:<channel>'


-- On users table — for referrals
ALTER TABLE users ADD COLUMN referral_code text UNIQUE;        -- their personal code
ALTER TABLE users ADD COLUMN referred_by_user_id uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN referral_credit_minor int NOT NULL DEFAULT 0;  -- balance earned
```

---

## The stacking rules (THE thing to lock down)

Two questions to answer definitively:

### Q1: Can pricing rules + promotions both apply?

**Yes.** Pricing rules apply first (per `03-pricing.md`), producing a subtotal. Promotions then apply on the subtotal.

### Q2: Can multiple promotions stack on one booking?

**Default: no. Maximum one promotion per booking.**

Exceptions (Phase D+, if needed):

- Bundle promo + referral credit can stack (different semantic categories)
- A platform welcome promo + a region-specific code can stack IF both are marked `is_stackable=true` and listed in each other's `stacks_with_codes`

Enforce in the engine: at quote time, if a guest has multiple eligible promotions, present them sorted by best-for-guest-value, let the guest pick (or auto-pick the best).

### The pricing engine extension

```ts
// packages/pricing/src/engine.ts — additions

export function applyPromotions(
  subtotal: MoneyAmount,
  promotions: AppliedPromotion[], // already validated as eligible
  context: BookingContext,
): {
  promo_discount_minor: number;
  applied_promotions: PromotionApplication[];
} {
  // Sort by stackability: non-stackable first (we pick best), then stackable
  const nonStackable = promotions.filter((p) => !p.is_stackable);
  const stackable = promotions.filter((p) => p.is_stackable);

  // Pick the best non-stackable (highest discount)
  const bestNonStackable = nonStackable
    .map((p) => ({ p, discount: computeDiscount(p, subtotal, context) }))
    .sort((a, b) => b.discount.minor - a.discount.minor)[0];

  // Apply best non-stackable + all stackable
  const applied: PromotionApplication[] = [];
  let runningTotal = subtotal;

  if (bestNonStackable) {
    applied.push({ promotion: bestNonStackable.p, discount: bestNonStackable.discount });
    runningTotal = runningTotal.subtract(bestNonStackable.discount);
  }

  for (const promo of stackable) {
    if (canStackWith(promo, applied)) {
      const discount = computeDiscount(promo, runningTotal, context);
      applied.push({ promotion: promo, discount });
      runningTotal = runningTotal.subtract(discount);
    }
  }

  const totalDiscount = applied.reduce((sum, a) => sum + a.discount.minor, 0);
  return { promo_discount_minor: totalDiscount, applied_promotions: applied };
}
```

This integrates into `computeQuote()` (the function in `03-pricing.md`) **after** subtotal calculation, **before** tax computation.

**Tax treatment:** taxes are computed on the **post-promotion total**, since taxes are owed on what the guest actually pays.

---

## Attribution — the actual value of promotions

Every promotion code is also a marketing analytics row.

```sql
-- Example query: which campaign drove the most revenue?
SELECT
  p.name,
  p.code,
  COUNT(bp.id) AS bookings,
  SUM(b.total_minor) / 100.0 AS revenue_php,
  SUM(bp.discount_minor) / 100.0 AS total_discount_php,
  AVG(b.total_minor) / 100.0 AS avg_booking_value
FROM promotions p
JOIN booking_promotions bp ON bp.promotion_id = p.id
JOIN bookings b ON b.id = bp.booking_id
WHERE p.starts_at >= '2026-01-01'
  AND b.status IN ('confirmed', 'checked_in', 'checked_out')
GROUP BY p.id, p.name, p.code
ORDER BY revenue_php DESC;
```

This becomes Metabase dashboard material:

- **Top performing campaigns this month**
- **CAC by promo** (discount + Tara commission lost vs. bookings won)
- **Net new vs. cannibalized** (did this promo bring NEW guests or just discount existing ones?)
- **Promo influence on future bookings** (do welcome-promo users come back at higher rate?)

Without this, you're flying blind on marketing spend.

---

## Anti-patterns (what NOT to do)

| Mistake                                              | Why bad                                                            | Better                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Always-on promo code (`WELCOME10` for years)         | Trains customers to expect discount; erodes margin                 | Campaign-bounded with end dates                                    |
| Letting owners stack promos with no caps             | Race to bottom; owners undercut each other unsustainably           | Max 1 owner promo at a time per property                           |
| Generic affiliate codes anyone can find              | "Influencer X" code shared on coupon sites = uncontrolled discount | Unique per-influencer codes, tracked                               |
| Promo applies to platform fee too                    | Tara loses commission on heavily promoted bookings                 | Promo applies only to the owner-portion or net subtotal            |
| Letting guests stack referral + welcome + flash sale | Math gets out of hand; revenue evaporates                          | Default: 1 promo max per booking                                   |
| Auto-expiring referral credits                       | Loses trust ("I had ₱500 credit and it disappeared!")              | Credits don't expire; or expire with very generous window (1 year) |
| Promoting on Tara homepage with deep discounts       | Trains all browsers to be discount-driven                          | Promo banners hidden from organic search arrivals                  |
| No usage caps                                        | Viral abuse: one code shared on Reddit = unlimited discount cost   | Total cap + per-user cap mandatory                                 |

---

## Phase rollout

| Phase                    | What's live                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **A (Months 0-6)**       | Nothing. We're free; no promos needed.                                                                                |
| **B (Months 6-12)**      | Schema reserved in DB (no UI). Maybe one founder-issued code for friends/family ("FAMILY100" — ₱100 off, manual).     |
| **C launch (Month ~12)** | First real promo: launch sale ("TARALAUNCH" -15% first month). First-booking welcome (₱300 off). Owner promo code UI. |
| **C+ (Months 12-24)**    | Referral codes shipped. Bundle promos (hostel + tour) automatic. Influencer code program (50+ codes).                 |
| **D (Year 2-3)**         | Loyalty / repeat-booker. Sophisticated targeting (segment-based promos). Dynamic discount calibration.                |
| **E+**                   | Subscription tier discounts. Travel insurance bundles. Group/event pricing.                                           |

---

## The legal note

PH consumer protection requires:

- Promo terms **prominently displayed** at code entry (not in fine print)
- "Up to ₱X off" claims must reflect realistic cases
- Bait-and-switch (showing huge discount but never applying it) is actionable
- T&C (per task #25) must include promotion policy

When Phase C launches, the launch promo's terms get reviewed by the lawyer alongside the rest.

---

## Implementation order when we actually build it (Phase C)

1. Schema migration (add `promotions`, `booking_promotions` tables + columns on `bookings`, `users`)
2. Promo entry UI on checkout page (`apps/web`)
3. Validation endpoint (`apps/api`): given (code, booking_context) → eligible? applied discount?
4. Pricing engine integration (extend `computeQuote()`)
5. Booking transaction extension (record the application in `booking_promotions`)
6. Admin UI for founder to create platform promotions
7. Owner UI for owner-specific promotions (separate, restricted)
8. Referral code generation on user signup
9. Referral attribution tracking
10. Attribution dashboards in Metabase

Tests: extensively property-based for the discount math, integration for the stacking rules, E2E for the checkout UX.

---

## What we deliberately defer

| Feature                                                           | Why later                                    |
| ----------------------------------------------------------------- | -------------------------------------------- |
| Dynamic personalized promos ("Maria gets her own code")           | Needs guest profile depth — Phase D          |
| Email-targeted promos (drip campaigns)                            | Email infrastructure (Phase C+) needed first |
| Promo A/B testing infrastructure                                  | Real volume needed first                     |
| Promo prediction ML (which promo will convert this guest?)        | Phase E+ luxury                              |
| Multi-platform promo sync (Booking.com promo applies on Tara too) | Channel manager work, Phase D+               |
| In-app deep-link promo codes                                      | Phase D mobile work                          |

---

## When this doc changes

- New promo type added → update enum + computation logic + tests
- Stacking rule modified → update engine + add regression test
- Attribution model expanded → coordinate with analytics (PostHog events)
- Phase D loyalty system → likely needs its own doc; this one references it
