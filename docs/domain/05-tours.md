# 05 — Tours & Activities

How Tara models the Rezdy-equivalent side of the marketplace: tours, day trips, activities. Adjacent to accommodation but **fundamentally a different inventory model** (time slots, not nights).

> Read [`glossary.md`](glossary.md). The "Tour Operator" persona is defined there. Also [`02-availability.md`](02-availability.md) (for the accommodation contrast) and [`03-pricing.md`](03-pricing.md) (pricing rules are similar).

For PH context, this matters because every backpacker stop has a cluster of tours:

- **Zambales**: Anawangin/Capones island hopping, ATV at Mt. Pinatubo, surfing in San Antonio/Pundaquit, Subic diving
- **Cebu**: Kawasan canyoneering, whale shark watching, Bantayan day trips
- **Siargao**: surf lessons, Naked Island tour, Sugba Lagoon
- **Coron**: island-hopping packages, wreck diving

The marketplace value isn't just "list accommodation" — it's **"hostel + tour bundle in one checkout."** That's the Klook/Hostelworld combo nobody does well.

---

## Three core concepts

```
Activity                  (the offering — "Anawangin island hopping")
   │
   └──< ActivitySlot      (instances in time — "Nov 14, 8am-5pm, max 12 guests")
            │
            └──< ActivityBooking  (a guest signed up for that slot)
```

### Activity

The thing being offered. Conceptually like a "Property" but for experiences.

```sql
activities {
  id                uuid PK,
  operator_id       uuid FK,           -- the tour operator (a kind of Owner)
  tenant_id         text,
  name              text,              -- "Anawangin Island Hopping"
  slug              text,
  description       text,
  region            text,              -- 'zambales'
  meeting_point     text,              -- address, GPS
  meeting_point_geo geography(point),
  duration_minutes  int,               -- typical duration
  difficulty        enum,              -- 'easy' | 'moderate' | 'challenging'
  category          enum,              -- 'island_hopping' | 'diving' | 'hiking' | 'surfing' | 'cultural' | 'other'
  min_age           int,
  max_age           int,               -- nullable for "no upper limit"
  inclusions        text[],            -- "lunch", "snorkel gear", "boat transfer"
  what_to_bring     text[],            -- "swimsuit", "sunscreen", "towel"
  cancellation_policy enum,
  base_price_minor  int,               -- per person, in minor units
  currency          text,
  is_active         bool,
  is_mock           bool,
  created_at, updated_at, deleted_at
}
```

### ActivitySlot

A scheduled instance of an activity. **This is where availability lives.**

```sql
activity_slots {
  id                uuid PK,
  activity_id       uuid FK,
  tenant_id         text,
  start_at          timestamptz NOT NULL,   -- UTC, but rendered in operator's TZ
  end_at            timestamptz NOT NULL,   -- derived from start + activity.duration, but explicit for flexibility
  capacity          int NOT NULL,           -- max guests this slot can take
  booked            int NOT NULL DEFAULT 0, -- denormalized count of confirmed/checked-in
  price_override_minor int,                  -- nullable; null = use activity base_price
  status            enum,                    -- 'open' | 'closed' (operator paused) | 'cancelled' (weather etc.)
  created_at, updated_at,
  CHECK (end_at > start_at),
  CHECK (booked >= 0 AND booked <= capacity)
}

CREATE INDEX activity_slots_start_idx ON activity_slots(activity_id, start_at);
CREATE INDEX activity_slots_open_idx  ON activity_slots(start_at) WHERE status = 'open';
```

### ActivityBooking

A guest's booking of N seats on a specific slot.

```sql
activity_bookings {
  id                uuid PK,
  slot_id           uuid FK,
  tenant_id         text,
  guest_id          uuid FK,
  related_booking_id uuid FK,           -- nullable; links to accommodation booking if bundled
  seats             int NOT NULL,        -- usually 1-4
  status            enum,                -- same lifecycle as bookings (hold → confirmed → ...)
  unit_price_minor  int,                 -- locked at booking time
  total_minor       int,
  currency          text,
  created_at, updated_at,
  CHECK (seats >= 1)
}
```

---

## How tour availability differs from accommodation

| Aspect                   | Accommodation                       | Tours                        |
| ------------------------ | ----------------------------------- | ---------------------------- |
| Atomic inventory unit    | unit-night (1 bed × 1 night)        | one seat on one slot         |
| Capacity per "container" | 1 (a bed sleeps 1 person at a time) | N (a slot can fit 12 people) |
| Time granularity         | full nights                         | hour-level slots             |
| Recurring?               | No (every night is its own row)     | Often (daily 8am tour)       |
| Cancellation impact      | release N specific bed-nights       | decrement `booked` counter   |

**Critical insight:** for accommodation, two people can't share a bed (same row). For tours, 12 people share a slot — we track via `booked` counter and `capacity`.

This means tour availability is a COUNTER check, not a row-existence check:

```sql
-- "Is this slot available for N seats?"
SELECT
  (capacity - booked) >= $requested_seats AS available
FROM activity_slots
WHERE id = $slot_id
  AND status = 'open'
  AND start_at > now();  -- can't book past slots
```

And the concurrency primitive is different — we need `SELECT ... FOR UPDATE` on the slot row (not on a units row), then increment `booked` atomically.

---

## Recurring slots — generation pattern

Most tours run daily. We don't store infinite future rows. We store a **schedule template** + generate slots N days out.

```sql
activity_schedules {
  id                uuid PK,
  activity_id       uuid FK,
  tenant_id         text,
  days_of_week      int[],         -- [1, 2, 3, 4, 5, 6, 0] = every day; [6, 0] = weekends only
  start_time        time,           -- 08:00
  duration_minutes  int,
  capacity          int,
  is_active         bool,
  effective_from    date,
  effective_until   date            -- nullable
}
```

A nightly cron job (BullMQ) generates the next 60 days of `activity_slots` from each active schedule. Idempotent — checks if slot already exists by (activity_id, start_at).

Operators can:

- Manually create one-off slots (e.g., private group booking)
- Cancel specific slots without affecting the schedule (e.g., bad weather)
- Pause schedules entirely (vacation)

---

## The booking flow — bundled with accommodation

The key UX win. After picking accommodation, guest is offered relevant tours:

```
1. Guest books bed at Maria's Surf Hostel for Nov 14-17
2. Checkout page shows: "Add these tours during your stay?"
3. Suggested tours are:
   - Activities near the property (within 30 min)
   - With open slots in the booking date range
   - In categories the property tags as relevant ("surf hostel" → surf lessons, island hopping)
4. Guest adds: "Anawangin Island Hopping Nov 15, 2 seats"
5. Same checkout, one payment captures both
6. Two bookings created with `accommodation_booking.id` linking to `activity_booking.related_booking_id`
```

**Pricing for bundles** (Phase C+): a `bundle_rule` table can offer discount when both booked together. Phase B: just same checkout, no discount.

**Refund handling for bundles:** cancelling accommodation does NOT auto-cancel tours (different operator, different policy). UI offers both options separately at cancellation.

---

## Tour Operator persona

A B2B user, separate from property Owners, but very similar model:

```sql
tour_operators {
  id                uuid PK,
  user_id           uuid FK,
  display_name      text,
  tenant_id         text,
  stripe_connect_account_id text,   -- same as property owners
  stripe_onboarding_status enum,
  payout_method     enum,           -- same options as property owners
  -- An operator can have multiple activities, like an Owner can have multiple Properties
}
```

In code, we use a unified `MerchantAccount` interface for both Owner and TourOperator — both have:

- Stripe Connect onboarding
- Payouts at T+24h after activity completion (or check-out for accommodation)
- Tara takes commission (15% for tours vs 10% for accommodation — see business model phases)

Why higher commission on tours? Industry benchmark — Klook takes 25%. We undercut significantly at 15% but still capture more margin than accommodation, where competition is fiercer (Hostelworld's 15% gives us less room).

---

## Tour cancellation policies

Three tiers, similar to accommodation but tighter time windows (tours have less re-sell capability):

| Policy     | Refund rules                                                                      |
| ---------- | --------------------------------------------------------------------------------- |
| `flexible` | Full refund if cancelled >24h before slot start. 50% within 24h-2h. 0% within 2h. |
| `moderate` | Full refund >48h before. 50% within 48h-12h. 0% within 12h.                       |
| `strict`   | Full refund >7 days. 0% within 7 days.                                            |

**Weather cancellations** (operator-initiated) are full-refund regardless of policy. UI for operator to mark slot `cancelled — weather` and refund all bookings.

**No-show:** treated as `cancelled` after slot end_at + 2h grace, with policy applied as if cancelled at slot start time. Owner can override (rare).

---

## Tour-specific edge cases

### Variable pricing per slot

A 8am Saturday tour might cost more than a 2pm Tuesday tour. `activity_slots.price_override_minor` handles. If null, falls back to `activity.base_price_minor`.

### Per-person vs per-group pricing

Some tours are per-person (typical for boat tours). Some are per-group flat (private guide).

Phase B: per-person only. Total = price × seats.

Phase C: add `pricing_mode` on activity: `'per_person'` | `'per_group'`. Group bookings have implications for capacity (1 booking takes the slot).

### Children pricing

Some tours: free under 5, half-price 5-12, full 13+. Adds complexity.

Phase B: simple per-seat (treats all as adult).

Phase C: add `age_pricing` config on activity: `[{ from: 0, to: 4, price_pct: 0 }, { from: 5, to: 12, price_pct: 50 }, { from: 13, to: 999, price_pct: 100 }]`. Guest declares ages at checkout.

### Multi-day activities (treks, sailing trips)

A 3-day Coron sailing trip occupies a slot spanning 3 days. The model handles this: slot has `start_at` and `end_at`, can span any duration.

Bundle implication: a guest doing a 3-day sail can't simultaneously book accommodation on those nights at a different property. UI shows conflict.

### Activity transfer (bus pickup, hotel pickup)

Some tours include pickup from accommodation. Modeled as a free field for now:

```sql
includes_pickup bool DEFAULT false,
pickup_areas text[]   -- 'San Antonio', 'Pundaquit', etc.
```

Operator coordinates with guest via WhatsApp. Phase D+: structured pickup scheduling.

### Group bookings (school trips, retreats)

A group of 30 wants to book the same tour together. Either:

- Book individual seats on one slot (if capacity ≥ 30)
- Operator creates a private slot just for them

For Phase B: manual — operator creates a one-off slot.

---

## The complete state machine

Tour activity bookings reuse the accommodation booking state machine ([`04-booking-lifecycle.md`](04-booking-lifecycle.md)) with minor adjustments:

| State                            | Tour-specific note                                             |
| -------------------------------- | -------------------------------------------------------------- |
| `STRIPE_HOLD` / `MANUAL_PENDING` | Same — 15 min Stripe hold or manual flow                       |
| `AWAITING_VERIFICATION`          | Only if operator uses manual mode                              |
| `CONFIRMED`                      | Same — increments `slot.booked`, generates ticket/voucher      |
| `CHECKED_IN`                     | "Guest arrived for the tour" — operator marks at meeting point |
| `CHECKED_OUT`                    | "Tour completed" — auto-flips at `slot.end_at + 2h`            |
| `CANCELLED` / `REFUNDED`         | Same — refund per policy                                       |

Auto-flip to `CHECKED_OUT` is more aggressive than accommodation (where owner manually marks). For tours, we assume completion unless flagged otherwise — most operators don't have time to mark each guest.

---

## Search & discovery

Activities surface in 4 places:

1. **Activity search page** (`/activities`) — independent, like accommodation search
2. **Region pages** — "Tours in Zambales"
3. **Property detail page** — "Tours near this hostel"
4. **Checkout add-on step** — bundle UX

Backend query for #3 ("tours near a property"):

```sql
SELECT a.*
FROM activities a
WHERE a.region = $property_region
  AND a.is_active = true
  AND ST_DWithin(
        a.meeting_point_geo::geography,
        $property_geo::geography,
        30000  -- 30km radius
      )
  AND EXISTS (
    SELECT 1 FROM activity_slots s
    WHERE s.activity_id = a.id
      AND s.start_at >= $stay_check_in
      AND s.start_at <= $stay_check_out
      AND s.status = 'open'
      AND s.booked < s.capacity
  )
ORDER BY a.featured DESC, a.review_score DESC
LIMIT 6;
```

PostGIS handles the geo distance. Indexed appropriately.

---

## Phase rollout

| Phase                | Tour features                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **A (Months 0-6)**   | Inventory in schema, mock data. No real activity bookings.                                                        |
| **B (Months 6-12)**  | Onboard 2-3 Zambales tour operators (Subic dive shop, Anawangin boat). Manual mode supported. Basic booking flow. |
| **C (Months 12-24)** | Public bundle pricing. Stripe Connect for operators. Recurring schedules.                                         |
| **D (Year 2-3)**     | Group bookings, age pricing, multi-day, pickup scheduling.                                                        |
| **E+**               | Klook/GetYourGuide-equivalent breadth — water sports rentals, food tours, classes                                 |

---

## Why this is genuinely a competitive moat

Klook is the dominant player but they:

- Take 25% from operators (vs our 15%)
- Don't pair tours with accommodation
- Have generic UX for hostel travelers
- Charge guests too (~$5 platform fee)

Tara's combined-checkout for "hostel + tour" is a clear UX win. Most backpackers book accommodation first, then realize they need a dive lesson three days later. We can serve that whole journey.

Combined with the Zambales-first geographic focus, this is what makes Tara _not just another Hostelworld clone_ but something genuinely new for PH backpacker travel.

---

## What's deliberately deferred

| Feature                                                                  | Phase | Why                                       |
| ------------------------------------------------------------------------ | ----- | ----------------------------------------- |
| Multi-language activity descriptions                                     | C     | English-only Phase B                      |
| Operator-side schedule UI                                                | C     | Phase B: founder configures via admin     |
| Capacity overbooking allowance (some tours sell 110% expecting no-shows) | D     | Phase B: hard cap                         |
| Activity reviews (separate from property reviews)                        | C     | Phase B: shared review model              |
| Tour categories taxonomy refinement                                      | C     | Phase B: 6 category enum                  |
| Hotel pickup scheduling                                                  | D     | Phase B: free-text coordination           |
| Equipment rental as separate inventory                                   | D     | Modeled as activity with capacity for now |

---

## When this doc changes

- New activity category → enum migration
- Pricing model change for tours → coordinate with `03-pricing.md`
- Operator onboarding flow change → coordinate with [ADR-0004](../adr/0004-payment-architecture.md)
- New booking flow features → coordinate with `04-booking-lifecycle.md`
