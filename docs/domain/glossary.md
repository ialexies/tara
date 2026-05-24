# Domain Glossary

Shared vocabulary for Tara. **Read this before any domain modeling discussion.**

Half of domain modeling is just agreeing on what words mean. A "room" means different things to a hotelier vs. a backpacker vs. an engineer — that disagreement is the source of most booking-engine bugs.

These definitions are **load-bearing.** When code says "room," it MUST mean what's defined here. When this glossary changes, hunt down every usage.

---

## Core inventory

### Property

A physical accommodation operation managed by one **owner**. A hostel, hotel, guesthouse, apartment, or resort.

- _Examples:_ "Maria's Surf Hostel" in San Antonio, "Casa Anawangin" in Pundaquit, "Wildflour Hotel" in Subic
- Has location (region, city, GPS), photos, description, amenities, policies
- Has zero or more **rooms**
- Owned by exactly one **owner** (multi-owner partnerships modeled later as `OwnerTeam`, deferred)

### Room

A bookable space within a property. A discrete physical area with a name a guest would understand.

- _Examples:_ "6-bed Mixed Dorm", "Private Double with Sea View", "Family Room with Balcony"
- Has a **room type** (`dorm` | `private`)
- For private rooms: the whole room is the bookable unit
- For dorms: each **bed** within is the bookable unit

### Bed

The smallest bookable inventory unit in a dorm. One physical sleeping spot.

- _Examples:_ "Bunk A — top", "Bunk B — bottom", "Bed 3 by the window"
- Only exists for `dorm`-type rooms
- A 6-bed dorm has 6 bed rows in the database
- Each bed can be booked independently by different guests

### Unit (internal term, not user-facing)

A generic name for "the thing that gets booked" — either a `bed` (dorm context) or the `room` itself (private context).

- The booking domain operates on **units** for uniformity
- The UI presents differently per context (you book "a bed in Mixed Dorm" or "Private Double")

### Bed-night / Unit-night

The atomic unit of inventory consumption: one bed (or unit), one night.

- A 3-night stay in a private double = 3 unit-nights
- A 3-night stay in a dorm bed = 3 bed-nights
- This is the unit availability searches operate on
- This is the unit pricing rules compute against

---

## Booking flow

### Quote

A price calculation for a hypothetical booking. **Not a commitment.** Computed from rate plans + pricing rules at request time.

- Includes nightly breakdown, taxes, fees, total
- Cached briefly (~5 min) so the price doesn't change between viewing and booking
- "Quote" ≠ "Hold" — a quote doesn't reserve inventory

### Hold

A temporary reservation of specific units for specific nights. Created when a guest clicks "Book" and proceeds to checkout. Expires after 15 minutes if payment doesn't complete.

- Implemented as: row in `bookings` table with `status='hold'` + a Redis lock per unit-night
- Other guests cannot book the same units during a hold
- A sweeper job releases expired holds (BullMQ scheduled task)

### Booking

A confirmed reservation. Money has been collected (or, for manual mode, owner has verified payment). Inventory is consumed.

- States: `hold` → `confirmed` → `cancelled` / `refunded` / `checked_in` / `checked_out`
- See `04-booking-lifecycle.md` for the full state machine

### BookingItem

One row per (booking, unit, night). A 3-night booking of 2 dorm beds = 6 BookingItems (2 units × 3 nights).

- This is the granular level at which inventory consumption is recorded
- Makes "which beds are taken on Friday Nov 14?" a fast indexed query

### Reservation (avoid this term)

Synonym for booking in casual usage. **We use "booking" everywhere in code.** "Reservation" only appears in user-facing copy.

---

## Pricing

### Rate Plan

A named pricing strategy attached to a room or property.

- _Examples:_ "Standard Rate", "Non-Refundable -10%", "Early Bird -15%", "Long Stay (7+ nights) -20%"
- Defines: base rate, included meals, cancellation policy, refundability
- A property can have multiple rate plans; guest picks at booking time (or default applies)

### Pricing Rule

A modifier applied to a rate plan based on conditions.

- _Examples:_ "+30% on weekends Oct-Mar", "−20% for 7+ nights", "+50% during Holy Week"
- Types: seasonal, length-of-stay, occupancy, last-minute, advance-booking, day-of-week
- Rules stack in a defined order (see `03-pricing.md`)

### Nightly rate

The price for one unit-night, after all rules applied.

- The actual currency amount stored in the BookingItem
- Audited at booking-time — if rates change later, the booking still references its locked rate

---

## Money

### Currency

ISO 4217 code (e.g. `PHP`, `USD`, `EUR`). Stored on the property; bookings inherit.

- All amounts in the database are integers in **minor units** (centavos/cents) — never floats
- `1500` PHP = ₱15.00
- See `07-money.md` for full money handling rules

### Display currency vs. settlement currency

- _Display:_ what the guest sees (might be USD via FX conversion)
- _Settlement:_ what the booking is actually denominated in (always PHP for PH properties)
- Owner is always paid in settlement currency
- FX rate is locked at booking time

### Commission / Take rate

Tara's percentage of the booking total. See [`business-model-phases`](../../../memory/business_model_phases.md):

- Phase B: 0% (manual mode, friends pricing)
- Phase C+: 8-10% (Stripe mode)

### Platform balance

Money sitting in Tara's Stripe platform account. Includes:

- Funds being held during the 24h-after-check-in window (will be transferred to owners)
- Tara's commission revenue
- Refund reserves

---

## Lifecycle states

### Property status

`draft` → `pending` → `active` → `paused` → `suspended` → `archived`
See ADR-0005 + the owner lifecycle diagram (#12 in `docs/architecture/diagrams.md`).

### Booking status

`hold` → `confirmed` → `cancelled` | `refunded` | `checked_in` | `checked_out` | `expired` | `failed`
See `04-booking-lifecycle.md`.

### Owner Stripe onboarding status

`not_started` → `incomplete` → `pending` → `active` | `rejected`
Driven by Stripe webhook `account.updated`.

---

## People

### Guest

The person staying. Books a property, pays Tara, leaves a review.

- Auth required to book (we don't do anonymous bookings)
- One Guest = one User

### Owner

The person who runs a property. Lists properties, sets prices, receives bookings, gets paid.

- Auth required obviously
- One User can have an Owner profile (becomes a B2B customer)
- An Owner can own multiple Properties

### Tara Staff (`admin` | `ops`)

Internal Tara people. Verify properties, handle disputes, run reports.

### Tour Operator

A B2B persona separate from property owners. Operates activities (dive shops, island hopping). Modeled in `05-tours.md`.

---

## Multi-tenancy

### Tenant

The data isolation boundary in our multi-tenant model. Roughly: "the owner's data world."

- `tenant_id` is on every owner-scoped table (properties, bookings, reviews, etc.)
- Every query filters by current request's tenant_id via the `withTenant()` wrapper
- See ADR-0002

### Public data vs. tenant data

- _Public:_ property listings (visible to all guests), reviews, anonymized aggregate stats
- _Tenant:_ bookings, owner-only settings, payout details, internal notes
- Public data is still scoped to a tenant for _write_; just not for _read_

---

## Time

### Night

The unit of stay. A "1-night stay" means the guest sleeps one night.

- A booking for `check_in=2026-11-14, check_out=2026-11-17` is 3 nights (14, 15, 16)
- Check-out date is **not** a night-of-stay; it's the morning the guest leaves
- All inventory math operates in nights, never in "days" (ambiguous)

### Check-in time / Check-out time

Property-specific times (e.g. check-in 2pm, check-out 11am) for arrival/departure.

- These are clock times, not date boundaries
- A guest who arrives at 1am Nov 15 is still booking the Nov 14 night

### Booking date vs. stay date

- _Booking date:_ when the reservation was made (e.g. Oct 12)
- _Stay date:_ when they sleep there (e.g. Nov 14-17)
- Pricing rules can target either ("booked 30+ days in advance", "stay during Christmas week")

### Timezone

All timestamps in DB are UTC (`timestamp with time zone`).

- Displayed in the property's local timezone (PH = UTC+8 for everything in Tara Phase A-B)
- Phase D+ when we go international, properties have a `timezone` field

---

## Concurrency

### Double-booking

The catastrophic failure mode: two guests both think they have the same bed for the same night.

- Causes: race condition between two checkout flows touching the same bed-night
- Prevention: pessimistic locking at the database (`SELECT ... FOR UPDATE`) + Redis holds
- See `06-concurrency.md` for the full mechanism

### Inventory contention

A milder problem: many guests trying to book limited inventory simultaneously. UX challenge (showing "3 left!", handling fast sellouts), not a correctness problem if concurrency is solved.

---

## Trust & safety

### Verified property

A property whose existence and basic claims have been confirmed.

- Phase A-B: founder physically visited
- Phase C+: documentation review + spot checks
- See `docs/business/trust-and-safety.md` (TBD)

### Mock data

Fake but realistically-shaped data used to make the platform look populated.

- Every row has `is_mock: boolean`
- One DELETE query (`WHERE is_mock = true`) kills it all
- See [mock data strategy memory](../../../memory/mock_data_strategy.md)

---

## Things we deliberately don't model (yet)

- **OwnerTeam** — multi-person ownership. Phase D when an OwnerTeam needs to share a property.
- **Channel inventory** — separate inventory pools per OTA. We pull everything from one pool until Phase 3 channel sync.
- **Soft availability** — "stop sells" by channel. Deferred to channel manager phase.
- **Loyalty / points** — Phase E feature.
- **Group blocking** — holding rooms for events (weddings, retreats). Deferred unless real demand.

---

## When this glossary changes

1. Update this file
2. Search the codebase for the old term
3. Update domain docs that reference it
4. Update ADRs only if a structural definition changed
5. Note it in the next weekly review

**Bad domain modeling almost always traces back to vocabulary drift.** Defend this file.
