# Domain Modeling

The booking domain is the heart of this platform. This directory contains the long-form thinking about how we model it — before code, alongside code, and to refresh ourselves later.

Get the domain right and the codebase stays clean. Get it wrong and you pay forever.

## Documents

| File                                                 | Status  | Purpose                                                                                                                      |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`glossary.md`](glossary.md)                         | ✅ Done | Shared vocabulary — bed/room/dorm/unit, hold, booking, rate plan, tenant, night, etc.                                        |
| [`01-inventory.md`](01-inventory.md)                 | ✅ Done | Properties → Rooms → Beds/Units. Why `Unit` is the universal bookable abstraction.                                           |
| [`02-availability.md`](02-availability.md)           | ✅ Done | `booking_items` table strategy, the canonical queries, double-booking prevention.                                            |
| `03-pricing.md`                                      | 📝 TBD  | Rate plans, pricing rules, dynamic pricing, taxes, fees                                                                      |
| [`04-booking-lifecycle.md`](04-booking-lifecycle.md) | ✅ Done | Booking state machine: Stripe + manual paths, transitions with side effects, cancellation policies, sweeper jobs, edge cases |
| `05-tours.md`                                        | 📝 TBD  | Activities and time-slot inventory (different model from accommodation)                                                      |
| [`06-concurrency.md`](06-concurrency.md)             | ✅ Done | Defense-in-depth (DB locks + recheck + partial unique index + Redis), failure scenarios, test plan, monitoring               |
| [`07-money.md`](07-money.md)                         | ✅ Done | Integer minor units, MoneyAmount value object, FX, PH tax model, commission math, refund rounding, formatting                |
| `08-temporal.md`                                     | 📝 TBD  | Time handling — timezones, check-in cutoffs, night boundaries                                                                |

## Reading order

For new contributors (or future-you returning after months):

1. `glossary.md` — get vocabulary right before anything else
2. `01-inventory.md` — what the data world looks like
3. `02-availability.md` — the core query of the platform
4. `04-booking-lifecycle.md` — what happens to a booking over time
5. `03-pricing.md` — how money is computed
6. `06-concurrency.md` — how we don't ruin guests' stays
7. `07-money.md` + `08-temporal.md` — gnarly details, read when needed
8. `05-tours.md` — separate adjacent domain
