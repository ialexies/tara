# 08 — Temporal

How Tara handles dates, times, nights, and timezones. This is the second most common source of catastrophic booking bugs (after money). Get it wrong → off-by-one nights, midnight-boundary disasters, daylight saving chaos.

> Read [`glossary.md`](glossary.md). Especially the definitions of `night`, `check-in time`, `check-out time`.

The fundamental rule: **all timestamps in DB are UTC. All dates (calendar concepts) are `DATE` type. Display in the property's local timezone.**

---

## Rule 1: Two kinds of "time" — keep them separate

A booking has two completely different temporal concepts:

1. **Timestamps** — "when did this thing happen?" (booking created, payment received, status changed)
   - DB type: `timestamp with time zone` (always UTC)
   - JS type: `Date` (UTC under the hood)

2. **Dates** — calendar concepts (check-in date, check-out date, nights)
   - DB type: `date` (no time, no timezone)
   - JS type: `string` `'YYYY-MM-DD'` or `Date` at noon UTC (to avoid TZ ambiguity)

**Don't mix them.** A check-in date is _not_ a timestamp. It's a calendar concept that's true regardless of timezone.

```ts
// ❌ WRONG: using Date for a check-in date introduces timezone bugs
const checkIn = new Date('2026-11-14'); // midnight UTC = afternoon Nov 13 in PHT!

// ✅ RIGHT: use a date-only type or noon-UTC convention
const checkIn: CalendarDate = '2026-11-14'; // string
// OR
const checkIn = new Date('2026-11-14T12:00:00Z'); // noon UTC, never crosses midnight in any TZ
```

---

## Rule 2: A "night" is the start date

A guest staying Nov 14-17 occupies nights **14, 15, 16**. Nov 17 is the morning they leave, not a stay-night.

```ts
function nightsInRange(checkIn: CalendarDate, checkOut: CalendarDate): CalendarDate[] {
  // Half-open interval: [checkIn, checkOut)
  // Range of nights = checkOut - checkIn
  const nights: CalendarDate[] = [];
  let current = checkIn;
  while (current < checkOut) {
    nights.push(current);
    current = addDays(current, 1);
  }
  return nights;
}

// Examples
nightsInRange('2026-11-14', '2026-11-17');
// → ['2026-11-14', '2026-11-15', '2026-11-16']  (3 nights)

nightsInRange('2026-11-14', '2026-11-15');
// → ['2026-11-14']  (1 night)

nightsInRange('2026-11-14', '2026-11-14');
// → []  (zero-night booking — invalid, rejected at controller)
```

This is _the_ canonical algorithm. Lives in `packages/temporal/src/nights.ts`. Property-based tested.

### Why half-open?

Because it makes arithmetic clean:

- `nights = checkOut - checkIn` (no off-by-one)
- A booking ending Nov 17 frees up Nov 17 for the next guest (correct)
- Concatenating two adjacent bookings (A: 14-17, B: 17-20) doesn't double-book Nov 17 (B's nights are 17, 18, 19)

Half-open intervals are the standard for date-range systems. ISO 8601 leans this way for `Period`.

---

## Rule 3: Timezones — UTC in storage, local for display

**Every timestamp in Postgres is `timestamp with time zone` (which Postgres normalizes to UTC).**

When we display to a user, we convert to:

- **Guest perspective:** the **property's local timezone** (not the guest's browser TZ).
  - A booking confirmation says "Check in 2pm on Nov 14 (Pundaquit time)" regardless of where the guest is browsing from.
  - Reason: avoid the "I thought 2pm meant my local time" confusion.

- **Owner perspective:** the **property's local timezone**.
  - Owner is at the property; that's their time reference.

- **Founder/admin perspective:** UTC by default in admin panel, or property-local when viewing a specific property.

### Property timezone

```sql
-- properties table
timezone text NOT NULL DEFAULT 'Asia/Manila',  -- IANA TZ name
```

Phase A-B: every property is `Asia/Manila`. Constant.
Phase D+ (international): owner sets per property. UI shows IANA TZ picker.

### Why store TZ on property and not derive from country?

- A country can span multiple time zones (Indonesia: WIB/WITA/WIT)
- TZ rules change occasionally; better to store explicitly
- Cheaper to query than convert at display time

---

## Rule 4: Date type — use a real library or Temporal API

JavaScript's `Date` is famously bad at this. Options:

| Library                     | When to use                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| **`date-fns`**              | Day-to-day operations (addDays, format, parse). Functional, tree-shakeable. **Default choice.** |
| **`date-fns-tz`**           | When timezone conversion is needed                                                              |
| **`@js-temporal/polyfill`** | The standards-track future. Use when stable in V8 (~2026 native).                               |
| **Luxon**                   | Heavier, more class-based. Skip unless you need its specific features.                          |
| **Moment**                  | **Deprecated.** Never start a new project with it.                                              |

**Tara default:** `date-fns` + `date-fns-tz`. Switch to native `Temporal` when V8 ships it.

```ts
// packages/temporal/src/nights.ts
import { addDays, differenceInDays, parseISO, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export type CalendarDate = string; // 'YYYY-MM-DD'

export function nightsBetween(checkIn: CalendarDate, checkOut: CalendarDate): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn));
}

export function addNights(date: CalendarDate, n: number): CalendarDate {
  return format(addDays(parseISO(date), n), 'yyyy-MM-dd');
}
```

---

## Rule 5: Check-in / check-out times

Each property declares:

```sql
-- properties table
check_in_time  time NOT NULL DEFAULT '14:00',   -- 2pm
check_out_time time NOT NULL DEFAULT '11:00',   -- 11am
```

These are **clock times** (no timezone). They're interpreted in the property's timezone.

**Display:** "Check in 2:00 PM, check out 11:00 AM, Pundaquit time."

**Doesn't affect:** the night math. A guest arriving at 11pm Nov 14 still books the Nov 14 night.

**Used for:**

- Showing arrival time to guest in emails
- Driving the auto-checkin/auto-checkout state transition (BullMQ runs at property's noon)
- Computing "available for next guest at..." for inventory chained bookings

### Early/late check-in

Optional extra cost or free, set per property:

```sql
early_check_in_available bool NOT NULL DEFAULT false,
early_check_in_fee_minor int,
late_check_out_available bool NOT NULL DEFAULT false,
late_check_out_fee_minor int,
```

Phase B: simple boolean + flat fee. Phase D: time slots / per-hour pricing.

---

## Rule 6: Booking date vs. stay date

Two different things:

- **Booking date** (`booking.created_at`) — when the reservation was made
- **Stay date** (`booking.check_in`, derived nights) — when the guest sleeps there

Pricing rules can target either:

- _"30+ days advance booking"_ → checks `(check_in - created_at).days >= 30`
- _"Stay during Christmas week"_ → checks `nights overlap [Dec 21, Dec 28)`
- _"Last-minute discount"_ → checks `(check_in - created_at).hours < 48`

Keep these straight in code via explicit parameter names: `(check_in_date, booking_date)` not `(d1, d2)`.

---

## Rule 7: Calendar arithmetic — beware

Some date math is harder than it looks:

### Adding "months"

```ts
addMonths('2026-01-31', 1); // = '2026-02-28' (Feb has no 31st)
addMonths('2026-02-29', 12); // = '2027-02-28' (not a leap year)
```

`date-fns` does the right thing (clamp to last day of target month), but be deliberate. Avoid month math where possible; use days/weeks/nights.

### Daylight saving

PH doesn't observe DST (`Asia/Manila` is UTC+8 year-round). No DST bugs for us in Phase A-B.

Phase D countries with DST (Europe, North America Phase E+): use `date-fns-tz`'s `utcToZonedTime` which handles transitions correctly.

### Leap seconds

Ignore. They've never broken a booking system; they won't break ours.

### Year-end boundary

Nothing magical. Dec 31 → Jan 1 is just another `addDays(d, 1)`.

---

## Rule 8: Time-based queries — use proper indexes

Common queries:

```sql
-- "Bookings starting in the next 30 days"
SELECT * FROM bookings
WHERE check_in >= CURRENT_DATE
  AND check_in < CURRENT_DATE + INTERVAL '30 days';
```

Needs index: `CREATE INDEX bookings_checkin_idx ON bookings (check_in);`

```sql
-- "Bookings overlapping a date range"
SELECT * FROM bookings
WHERE check_in < $end_date
  AND check_out > $start_date;
```

For range overlap queries, the standard pattern is `[a.start < b.end] AND [a.end > b.start]`. Index on `check_in` and `check_out` separately; query planner picks.

Heavy overlap queries (e.g. "show availability for next 60 days for this property") → consider GIST range indexes:

```sql
CREATE INDEX bookings_date_range_idx ON bookings
  USING GIST (daterange(check_in, check_out, '[)'));
```

Only add if profiling shows the basic indexes are slow. Premature.

---

## Rule 9: Booking duration constraints

Some properties accept only specific stay lengths:

```sql
-- properties table
min_nights int NOT NULL DEFAULT 1,
max_nights int NOT NULL DEFAULT 30,
```

Plus per-rate-plan overrides (Phase C+):

- "Long-stay rate" requires `min_nights = 7`
- "Weekend special" requires exactly 2 nights, Friday or Saturday start

Validated at quote time, before hold creation. Error message: clear about what to do ("This property requires 3-night minimum stays").

---

## Rule 10: Sleeper edge cases

### Crossing midnight

A guest checks in at 11:55 PM Nov 14, falls asleep at 12:05 AM Nov 15. Their booking-night is Nov 14 (the calendar date when they checked in). No special handling.

### Same-day check-in/check-out

`check_in === check_out`. Zero nights. **Invalid.** Reject at the controller.

```ts
if (!isAfter(parseISO(checkOut), parseISO(checkIn))) {
  throw new BadRequestError('check_out must be after check_in');
}
```

### Far-future bookings

A guest tries to book for Dec 2030. Technically valid. Practically: most properties' calendars don't extend that far.

Solution: properties have `max_advance_booking_days` (default 365). Bookings beyond rejected.

### Past-date bookings

A user tries to book yesterday. Reject. Also reject "in the next 4 hours" if `property.min_advance_booking_hours = 4`.

### Zero-day to check-in

A backpacker arriving today wants to book for tonight. Default allowed. Property can override via `min_advance_booking_hours`.

---

## DB schema for temporal fields

```sql
-- Timestamps (always UTC)
created_at  timestamptz NOT NULL DEFAULT now(),
updated_at  timestamptz NOT NULL DEFAULT now(),
confirmed_at timestamptz,
cancelled_at timestamptz,
expires_at  timestamptz,

-- Calendar dates (no time, no TZ)
check_in    date NOT NULL,
check_out   date NOT NULL,
CHECK (check_out > check_in),

-- Clock times (no date, no TZ — interpreted in property TZ)
check_in_time   time NOT NULL DEFAULT '14:00',
check_out_time  time NOT NULL DEFAULT '11:00',

-- Property TZ
timezone text NOT NULL DEFAULT 'Asia/Manila',
```

`timestamptz` is the right choice over `timestamp without time zone` always — Postgres normalizes to UTC, and stores correctly regardless of session TZ. Cheap insurance.

---

## Display formatting

Use `Intl.DateTimeFormat` with the user's locale + property's TZ:

```ts
// packages/temporal/src/format.ts
export function formatCheckIn(
  date: CalendarDate,
  time: string, // 'HH:mm'
  tz: string, // 'Asia/Manila'
  locale: string = 'en-PH',
): string {
  const d = zonedTimeToUtc(`${date} ${time}`, tz);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: tz,
    timeZoneName: 'short',
  }).format(d);
}

// Usage
formatCheckIn('2026-11-14', '14:00', 'Asia/Manila', 'en-PH');
// → "Sat, Nov 14, 2026 at 2:00 PM PHT"
```

This is the ONLY place where we cross the storage/display boundary for temporal data.

---

## Testing — property-based tests for date math

```ts
describe('nightsBetween', () => {
  it('returns positive integer for valid ranges', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.nat({ max: 365 }),
        (checkIn, daysToAdd) => {
          const checkOut = addDays(checkIn, daysToAdd + 1); // at least 1 night
          const nights = nightsBetween(
            format(checkIn, 'yyyy-MM-dd'),
            format(checkOut, 'yyyy-MM-dd'),
          );
          expect(nights).toBeGreaterThan(0);
          expect(Number.isInteger(nights)).toBe(true);
        },
      ),
    );
  });

  it('is the same as addNights inverse', () => {
    fc.assert(
      fc.property(calendarDate(), fc.integer({ min: 1, max: 365 }), (start, n) => {
        const end = addNights(start, n);
        expect(nightsBetween(start, end)).toBe(n);
      }),
    );
  });

  it('returns 0 for same date', () => {
    fc.assert(
      fc.property(calendarDate(), (d) => {
        expect(nightsBetween(d, d)).toBe(0);
      }),
    );
  });
});

describe('nightsInRange', () => {
  it('returns N dates for an N-night booking', () => {
    fc.assert(
      fc.property(calendarDate(), fc.integer({ min: 1, max: 365 }), (start, n) => {
        const end = addNights(start, n);
        const nights = nightsInRange(start, end);
        expect(nights).toHaveLength(n);
        expect(nights[0]).toBe(start);
        expect(nights[nights.length - 1]).toBe(addNights(start, n - 1));
      }),
    );
  });
});
```

---

## Phase D: when we go international

| Decision                                                | When      | Where it lives                                     |
| ------------------------------------------------------- | --------- | -------------------------------------------------- |
| Property has TZ field (already there)                   | Phase A-B | `properties.timezone`                              |
| Owner sets TZ on property creation UI                   | Phase D   | Admin form                                         |
| DST-aware time conversion                               | Phase D   | `date-fns-tz` handles                              |
| Multi-region search ("show me hostels in any timezone") | Phase D   | Search service ignores TZ for ranking, just stores |
| Localized date formats (US: MM/DD/YY vs PH: DD/MM/YY)   | Phase D   | `Intl.DateTimeFormat(locale)` already handles      |

---

## What we deliberately don't do

| Thing                                   | Why                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Hourly bookings                         | Hostels don't do this. Tours (doc 05) have time slots, separate model.   |
| Sub-night minimums                      | "Day-use room" is a hotel concept, not relevant Phase A-B                |
| Cross-midnight billing rules            | Standard night model; arrivals at 1am still book the prior calendar date |
| Custom calendars (Hijri, Chinese lunar) | Display formatting may need to; storage stays Gregorian                  |
| Negative nights / time travel           | Reject at validation                                                     |

---

## When this doc changes

- New library / Temporal API native → update package
- New TZ added to property options → migration
- DST country → verify `date-fns-tz` handles it (it does); add a test
- ADR if changing the date-stored-as-string convention
