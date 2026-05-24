# 02 — Availability

How Tara answers "is X free for nights Y-Z?" Fast, correct, and concurrent-safe.

> Read [`glossary.md`](glossary.md) and [`01-inventory.md`](01-inventory.md) first.

This is the **most-run query in the entire system.** Every search hits it. Every booking touches it. Get it wrong → slow site or double bookings.

---

## The question, stated precisely

**Given:** a set of `unit_id`s, a date range `(check_in, check_out)` where check_in < check_out and both are calendar dates.

**Return:** for each unit, whether ALL nights in `[check_in, check_out)` are free.

> Math note: the range is half-open. `check_in=Nov 14, check_out=Nov 17` means nights of 14, 15, 16 (three nights). Nov 17 is the morning the guest leaves and is not a stay-night.

A unit is **free for night N** if there is no `booking_item` with `unit_id=X, night=N` that belongs to a booking in an "active" state (`hold`, `confirmed`, `checked_in`).

---

## Storage model — three options compared

This is the most important design choice in the doc. Three approaches; we pick option B.

### Option A — Compute availability on demand (no inventory table)

```sql
-- Is unit X free for night N?
SELECT NOT EXISTS (
  SELECT 1 FROM booking_items bi
  JOIN bookings b ON b.id = bi.booking_id
  WHERE bi.unit_id = X
    AND bi.night = N
    AND b.status IN ('hold', 'confirmed', 'checked_in')
);
```

- **Pro:** No denormalization. Bookings are the source of truth; availability is derived.
- **Pro:** Cancellation/refund automatically frees inventory.
- **Con:** Every availability query JOINs through bookings table. Gets slow at scale.
- **Con:** Bulk availability calendar UI (owner sees a month at a glance) is N queries.

### Option B — `booking_items` table (one row per unit per night) — **RECOMMENDED**

```sql
-- booking_items is the canonical inventory consumption table.
-- One row per (booking, unit, night).
-- Indexed by (unit_id, night) for fast availability queries.
booking_items {
  id uuid PK,
  booking_id uuid FK,
  unit_id uuid FK,
  night date,
  rate_minor int,           -- locked-in nightly rate at booking time
  currency text,
  created_at timestamptz
}

CREATE UNIQUE INDEX booking_items_unit_night_active_idx
  ON booking_items (unit_id, night)
  WHERE booking_id IN (active bookings); -- partial index, see below
```

- **Pro:** "Is unit X free for night N?" = single index lookup. ~1ms.
- **Pro:** "Show me availability for unit X for next 30 nights" = single range scan.
- **Pro:** Multi-unit, multi-night queries are also fast.
- **Pro:** Partial unique index on active bookings PHYSICALLY PREVENTS double-bookings at the database level (defense in depth).
- **Con:** A 7-night booking of 4 dorm beds creates 28 booking_item rows. Not a problem at our scale.

### Option C — Availability bitmap / calendar table

Pre-materialized "unit X night N is free/booked" table. Maintained via triggers.

- **Pro:** Fastest reads.
- **Con:** Triggers are debugging hell; double source of truth (bookings vs. calendar); migrations harder.
- **Con:** Overkill for our query volume; revisit only if Option B becomes a bottleneck (it won't for years).

**Decision: Option B.** It's the standard pattern (Booking.com, Hostelworld, Cloudbeds — all do variations of this). Right balance of simplicity + performance.

---

## The query patterns (canonical SQL)

### Pattern 1: "Is this exact set of units free for these exact nights?"

Used at **checkout time** — final check before creating a hold.

```sql
-- Returns the units that ARE taken (we want zero rows back to proceed).
SELECT bi.unit_id, bi.night
FROM booking_items bi
JOIN bookings b ON b.id = bi.booking_id
WHERE bi.unit_id = ANY($1::uuid[])         -- the units guest wants
  AND bi.night >= $2 AND bi.night < $3      -- the night range
  AND b.status IN ('hold', 'confirmed', 'checked_in');
```

If this returns zero rows → free. Wrap in transaction with `SELECT ... FOR UPDATE` on units to prevent races (see `06-concurrency.md`).

### Pattern 2: "Show me everything available in Zambales for nights Y-Z, sleeps 2"

Used at **search time** — the most-frequent query.

```sql
-- High level: properties in region, with at least N units that are free
-- for ALL nights in the date range.

WITH desired_nights AS (
  SELECT generate_series($check_in::date, $check_out::date - 1, '1 day')::date AS night
),
unit_availability AS (
  SELECT u.id AS unit_id, u.room_id, r.property_id
  FROM units u
  JOIN rooms r ON r.id = u.room_id
  JOIN properties p ON p.id = r.property_id
  WHERE p.region = $region
    AND p.status = 'active'
    AND u.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.unit_id = u.id
        AND bi.night >= $check_in
        AND bi.night < $check_out
        AND b.status IN ('hold', 'confirmed', 'checked_in')
    )
)
SELECT property_id, count(DISTINCT unit_id) AS available_units
FROM unit_availability
GROUP BY property_id
HAVING count(DISTINCT unit_id) >= $sleeps;
```

Index strategy makes this fast:

- `booking_items (unit_id, night)` — for the inner NOT EXISTS
- `properties (region, status)` — for the outer filter
- `units (room_id, is_active)`, `rooms (property_id)` — for the JOINs

At ~1000 properties × ~30 nights search range, this query returns in <50ms with these indexes.

### Pattern 3: "Calendar view for the owner — show me the next 60 nights of unit X"

Used in the **owner dashboard**.

```sql
SELECT bi.night, b.id AS booking_id, b.status, b.guest_id
FROM booking_items bi
JOIN bookings b ON b.id = bi.booking_id
WHERE bi.unit_id = $unit_id
  AND bi.night >= current_date
  AND bi.night < current_date + interval '60 days'
ORDER BY bi.night;
```

Application code fills in the "free" gaps (any night without a row = free).

### Pattern 4: "How many beds are taken tonight across all my properties?"

Used in **owner dashboard summary** and **founder ops dashboard**.

```sql
SELECT count(*)
FROM booking_items bi
JOIN bookings b ON b.id = bi.booking_id
WHERE bi.night = current_date
  AND b.status = 'checked_in'
  AND b.tenant_id = $tenant_id;
```

---

## The atomicity guarantee — preventing double-bookings

This is the hard part. Two guests both clicking "Book" on the last dorm bed at the same moment.

**Sequence at booking time:**

```
BEGIN;

  -- 1. Acquire row lock on each unit being booked
  SELECT id FROM units
  WHERE id = ANY($unit_ids)
  FOR UPDATE;
  -- ^ blocks other transactions trying to lock same units

  -- 2. Verify availability inside the transaction
  SELECT bi.unit_id, bi.night
  FROM booking_items bi
  JOIN bookings b ON b.id = bi.booking_id
  WHERE bi.unit_id = ANY($unit_ids)
    AND bi.night >= $check_in
    AND bi.night < $check_out
    AND b.status IN ('hold', 'confirmed', 'checked_in');
  -- ^ if any rows returned → ABORT, units became unavailable mid-flow

  -- 3. Insert booking + booking_items
  INSERT INTO bookings (..., status='hold', expires_at=now() + interval '15 minutes')
  RETURNING id;

  INSERT INTO booking_items (booking_id, unit_id, night, rate_minor, currency)
  VALUES (...);  -- one row per unit per night

  -- 4. Also set Redis lock (belt + braces)
  --    SET hold:unit:<unit_id>:<night> 1 NX EX 900
  --    Done in app code after COMMIT

COMMIT;
```

The `SELECT ... FOR UPDATE` on units is the critical primitive. Postgres serializes the transactions: whichever one gets the lock first wins; the second gets blocked until commit, then sees the new booking_items, then aborts because availability check returns rows.

**Why the partial unique index too?**

```sql
CREATE UNIQUE INDEX booking_items_unit_night_active_idx
  ON booking_items (unit_id, night)
  -- Postgres: WHERE clause makes this index "partial" — only covers active rows
  WHERE booking_id IN (
    SELECT id FROM bookings WHERE status IN ('hold', 'confirmed', 'checked_in')
  );
-- NOTE: Postgres partial indexes don't allow subqueries in WHERE.
-- Real impl uses a denormalized status column on booking_items, or
-- enforces via trigger. See "implementation details" below.
```

Defense in depth: if a bug ever bypasses the application-level locks, the database itself will reject the duplicate insert. Belt + suspenders + safety net.

---

## Implementation details

### Denormalize status on booking_items for the partial index

Real-world Postgres trick:

```sql
booking_items {
  ...
  active boolean NOT NULL DEFAULT true,  -- maintained via trigger
}

CREATE UNIQUE INDEX booking_items_unit_night_active_idx
  ON booking_items (unit_id, night)
  WHERE active = true;
```

Trigger on `bookings.status` update sets `booking_items.active = (status IN ('hold','confirmed','checked_in'))`.

This gives us the physical uniqueness guarantee without a subquery in the partial-index predicate.

### Redis holds — what they add

The DB lock is for correctness. Redis is for UX:

- 15-minute hold timer (a row in DB can stay, but the user might abandon checkout)
- Allows showing "X is being booked by another guest, try again in 14 minutes" without re-querying DB
- Cheap to release (DEL key)
- Sweeper job in BullMQ removes expired holds from DB if Redis lock expires

Pattern:

```
On checkout start:
  SET hold:unit:<id>:<night> <booking_id> NX EX 900

On payment success:
  -- Promote DB booking to 'confirmed'
  DEL hold:unit:<id>:<night>

On checkout abandonment (15 min Redis TTL expires):
  -- BullMQ job: find DB bookings in 'hold' state past expiry, mark 'expired'
```

### Caching availability search results

The "search a region for these dates" query is run thousands of times.

- **Cache key:** `availability:<region>:<check_in>:<check_out>:<sleeps>`
- **TTL:** 60 seconds
- **Invalidation:** on every booking creation/cancellation in the region (BullMQ job kicks)

This gives us 10-100x query reduction during peak browsing without sacrificing freshness for actual bookings (the cache is too short to allow a booking against stale data; the final checkout-time verification catches any race).

---

## Performance budget

- **Search query (region + 30 nights):** < 50ms p95, < 200ms p99
- **Checkout availability check (single unit, single night range):** < 10ms p95
- **Owner calendar (60 nights, single property):** < 100ms p95
- **Concurrent booking contention:** 100+ simultaneous attempts on same unit handled within 2 seconds (acquire-lock latency tail)

Monitored via Grafana (Phase B+). Alert if p95 exceeds budget by 50%.

---

## Edge cases to handle

### Cross-day timezone weirdness

A guest checks in at 11pm Nov 14. The night is Nov 14 (regardless of arrival time). Our model uses `night = check_in_date`, not `night = arrival_clock_time`. No issue.

### Late check-out

Guest stays until 6pm Nov 17 (property's late check-out policy). Their booking still ends Nov 17 (the morning departure). The next guest's booking can start Nov 17 (because Nov 17 isn't a stay-night for either). Operationally, the property may need a buffer night blocked — owner can do this manually via "block date" feature.

### Same-day check-in/check-out (impossible but enforce)

Application validates `check_out > check_in`. DB constraint: `CHECK (check_out > check_in)`.

### Booking spans across availability change

Owner marks a room as blocked Nov 15. There's an existing booking covering Nov 14-17. Existing booking stays. The "block" only prevents NEW bookings from being created.

### Held booking expires during another guest's search

Common case. Guest A holds unit. Guest B searches: sees unit as taken (correctly — holds count). Guest A abandons checkout. 15 min later, sweeper marks Guest A's booking as expired → that unit's booking_items become active=false → next search by Guest B shows it available again.

---

## What's deliberately deferred

| Feature                                             | Phase | Why                                     |
| --------------------------------------------------- | ----- | --------------------------------------- |
| Soft inventory limits (MaxOccupancyPerProperty)     | C+    | Phase B = one bed = one booking, simple |
| Length-of-stay min/max constraints                  | C     | Pricing problem, not inventory          |
| Date-range availability subscriptions ("notify me") | D     | Phase B has too little data             |
| Real-time availability via WebSockets to guest      | D     | Polling is enough for now               |

---

## Test plan

Critical tests for this code path (high coverage non-negotiable):

1. **Single-unit single-night**: free → book → not free
2. **Multi-night**: book 3 nights, query each night returns booked
3. **Multi-unit**: book 2 beds same room, others remain free
4. **Concurrent booking** (the famous one): two simultaneous booking attempts on the last bed → exactly one succeeds, other rejected cleanly
5. **Hold expiry**: hold a unit, wait 15 min, verify unit becomes available
6. **Cancellation frees inventory**: cancel a confirmed booking, verify those nights free again
7. **Tenant isolation**: tenant A cannot see tenant B's booking_items
8. **Date boundary**: book Nov 14-17, verify Nov 13 free, Nov 14-16 booked, Nov 17 free
9. **Search performance under load**: 1000 properties × 30 nights = < 50ms

Property-based testing (fast-check) for the date-range math is recommended.

---

## When this doc changes

- Update the SQL patterns if the schema evolves
- Update the performance budget if requirements shift
- Add new edge cases as they're discovered
- The double-booking prevention strategy is **load-bearing.** Any change here requires an ADR.
