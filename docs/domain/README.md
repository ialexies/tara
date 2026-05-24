# Domain Modeling

The booking domain is the heart of this platform. This directory contains the long-form thinking about how we model it — before code, alongside code, and to refresh ourselves later.

Get the domain right and the codebase stays clean. Get it wrong and you pay forever.

## Planned documents

| File | Purpose |
| --- | --- |
| `glossary.md` | Shared vocabulary — what does "bed", "room", "dorm", "rate plan", "booking", "hold" mean here? |
| `01-inventory.md` | Properties, rooms, dorm beds, units — how inventory is structured |
| `02-availability.md` | How we store and query "is X free for nights Y-Z" |
| `03-pricing.md` | Rate plans, pricing rules, dynamic pricing, taxes, fees |
| `04-booking-lifecycle.md` | The booking state machine: hold → confirmed → cancelled → refunded → ... |
| `05-tours.md` | Activities and time-slot inventory (different model from accommodation) |
| `06-concurrency.md` | How we prevent double-bookings — locks, transactions, holds |
| `07-money.md` | Currency, FX, rounding, tax, multi-currency display |
| `08-temporal.md` | Time handling — timezones, check-in cutoffs, what counts as a "night" |

These will fill in as we go. The glossary comes first.
