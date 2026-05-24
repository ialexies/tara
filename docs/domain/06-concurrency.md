# 06 — Concurrency & Double-Booking Prevention

How Tara guarantees that **two guests never get the same bed for the same night**, even under high load and adversarial timing.

> Read [`02-availability.md`](02-availability.md) and [`04-booking-lifecycle.md`](04-booking-lifecycle.md) first. This doc goes deeper on the mechanism.

**This is the single most important correctness property in the system.** A double-booking means a guest arrives, finds no bed, leaves a 1-star review, demands a refund, and never trusts Tara again. Spreads on social. Brand damage.

We use **defense in depth** — four overlapping mechanisms. Any one would mostly work; together they make double-booking effectively impossible.

---

## The four layers

```
   Layer 1: Database row locks (SELECT ... FOR UPDATE on units)
   ↓
   Layer 2: Transaction-scoped availability recheck
   ↓
   Layer 3: Partial unique index on booking_items (active rows)
   ↓
   Layer 4: Redis cache hold (UX hint + early reject)
```

Layers 1-3 give **correctness.** Layer 4 gives **good UX** (fail fast, don't make user fill out checkout to learn the bed is gone).

---

## Layer 1 — Database row locks

The core primitive. `SELECT ... FOR UPDATE` on the rows you're about to commit against.

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;

-- Acquire row-level locks on units. Other transactions trying to lock
-- these same rows will WAIT until our transaction commits or rolls back.
SELECT id, room_id
FROM units
WHERE id = ANY($1::uuid[])
ORDER BY id              -- deterministic order = no deadlocks between concurrent txns
FOR UPDATE;
```

**Why this works:** Postgres guarantees that `SELECT ... FOR UPDATE` blocks other transactions trying to write the same rows. The second concurrent attempt waits at the lock until the first commits, then sees the new booking_items and aborts (Layer 2).

**Why `ORDER BY id`:** if two transactions try to lock the same set of units in different orders, you can deadlock (txn A locks U1 then U2; txn B locks U2 then U1; both wait forever). Locking in consistent order prevents the cycle.

**Why `READ COMMITTED`** (Postgres default) is fine: we explicitly recheck availability in Layer 2 after acquiring the lock, which sees committed data. Higher isolation levels (`REPEATABLE READ`, `SERIALIZABLE`) add overhead without buying anything for our case.

### What if we locked `booking_items` instead of `units`?

You can't lock a row that doesn't exist yet. If unit X has zero bookings for night N, there's no row in `booking_items` to lock. Locking `units` (which always exists) gives us a stable lock target.

### Lock granularity

We lock `units`, not `properties`. Locking properties would serialize ALL bookings for a hostel, killing throughput at a popular property. Unit-level is precise enough.

For a multi-unit booking (e.g., guest books 3 dorm beds at once), we acquire 3 locks. Still much narrower than property-level.

---

## Layer 2 — Transaction-scoped availability recheck

After acquiring the lock, **immediately verify the units are still free** for the requested nights. Inside the same transaction.

```sql
SELECT bi.unit_id, bi.night
FROM booking_items bi
JOIN bookings b ON b.id = bi.booking_id
WHERE bi.unit_id = ANY($1::uuid[])
  AND bi.night >= $2 AND bi.night < $3
  AND b.status IN ('stripe_hold', 'manual_pending', 'awaiting_verification',
                   'confirmed', 'checked_in', 'disputed');
```

If this returns **any row**, those units are taken. **ABORT the transaction**, return 409 to the client. (UI says: "Sorry, those beds were just booked by someone else. Please pick again.")

Why this is necessary even with Layer 1:

The lock prevents two transactions from running concurrently against the same units. But the lock doesn't tell you whether the bed was booked **before** your transaction started. The recheck inside the lock confirms current state, which is the true source of truth.

**Sequence:**

```
Txn A starts → locks U1, checks availability → free → inserts booking_items
Txn B starts → tries to lock U1 → waits...
Txn A commits → releases lock
Txn B acquires lock → checks availability → SEES Txn A's row → ABORTS cleanly
```

Both transactions ran. One succeeded, one rejected with a clean error. No double-booking.

---

## Layer 3 — Partial unique index (DB-level safety net)

Even if a bug in app code somehow bypasses Layers 1-2, the database itself refuses to insert a duplicate.

```sql
-- booking_items table includes a denormalized `active` boolean,
-- maintained via trigger on bookings.status change.

CREATE UNIQUE INDEX booking_items_unit_night_active_uq
  ON booking_items (unit_id, night)
  WHERE active = true;
```

The `WHERE active = true` makes this a **partial index** — only enforces uniqueness over rows that represent active inventory consumption. Cancelled/expired/failed bookings have `active=false`; their old rows still exist (for audit) but don't block new bookings on the same bed-night.

**Why a trigger?**

We could maintain `active` in application code on every status change, but Postgres triggers are bulletproof. If anyone (including a manual DB query, or a future bug) updates `bookings.status`, the trigger keeps `booking_items.active` in sync.

```sql
CREATE OR REPLACE FUNCTION sync_booking_items_active() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('stripe_hold', 'manual_pending', 'awaiting_verification',
                    'confirmed', 'checked_in', 'disputed') THEN
    UPDATE booking_items SET active = true WHERE booking_id = NEW.id;
  ELSE
    UPDATE booking_items SET active = false WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_status_sync_items
AFTER UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_booking_items_active();
```

**The defense:** if a future bug ever creates a second booking_item with the same (unit_id, night) while one is active, Postgres throws a unique constraint violation. The buggy code path fails loudly instead of silently corrupting data.

We treat any `booking_items_unit_night_active_uq` violation in production logs as a **P0 alert**. It means a logic bug bypassed Layers 1-2.

---

## Layer 4 — Redis cache hold (UX layer)

Layers 1-3 are correctness. Layer 4 is UX.

When a guest enters checkout, we set a Redis key:

```
SET hold:unit:<unit_id>:<YYYY-MM-DD> <booking_id> NX EX 900
```

- `NX` — only set if not exists (so a second guest's checkout sees the conflict immediately)
- `EX 900` — 15-minute TTL

If the SET fails because the key exists, we know another checkout is in flight. The UX can show: **"Someone else is currently booking this bed. They have 12 more minutes to complete. Try a different bed or wait."**

If we didn't have Redis, the second guest would fill out the entire checkout form, click "Pay", and then learn at the LAST step that the bed is taken. Bad UX. Redis tells them in 200ms.

**On payment success:** `DEL hold:unit:<unit_id>:<night>` — release the UX hold (the DB booking_items row is now the authoritative reservation).

**On checkout abandonment:** Redis TTL handles it. After 15 min, key auto-expires; the DB booking is swept by BullMQ shortly after.

**On crash mid-checkout:** Same as abandonment. TTL self-heals.

**Why Redis is not authoritative:** if Redis goes down mid-checkout, the DB is still correct (Layers 1-3 enforce). We just lose the UX nicety. Acceptable.

---

## The full booking flow with all layers

```
1. Guest clicks "Book bed X for nights Y-Z"
   ↓
2. App tries Redis SET hold:unit:X:Y NX EX 900 (and for each night)
   - Fails? → "Someone else is booking this. Try again."
   - Success? → continue
   ↓
3. App opens DB transaction (READ COMMITTED)
   ↓
4. SELECT id FROM units WHERE id IN (...) ORDER BY id FOR UPDATE
   - Blocks if another txn holds the lock
   ↓
5. Recheck: SELECT booking_items overlapping (X, Y..Z) where active=true
   - Any rows? → ROLLBACK, release Redis hold, return 409
   - Zero rows? → continue
   ↓
6. INSERT booking (status='stripe_hold' or 'manual_pending')
   ↓
7. INSERT booking_items (with active=true via trigger)
   - Layer 3 partial unique index fires if duplicate slipped through
   ↓
8. INSERT booking_event ('created')
   ↓
9. COMMIT — releases lock
   ↓
10. Outside transaction:
    - Stripe mode: create PaymentIntent (network call to Stripe)
    - Manual mode: generate reference code, email guest
   ↓
11. Return booking ID + payment instructions to client
```

If any step 3-9 fails, the entire transaction rolls back. Inventory stays consistent.

---

## Failure scenarios — what happens, what we do

### Scenario A: Two guests, same bed, same nights, simultaneous click

**Walkthrough:**

- T=0ms: Guest A's request arrives, sets Redis hold OK, opens txn, acquires lock on unit X
- T=2ms: Guest B's request arrives, tries to set Redis hold → fails → 409 returned
- T=10ms: Guest A's txn completes successfully

Result: Guest A books. Guest B sees clean rejection in ~5ms. No double-booking.

### Scenario B: Two guests slip past Redis (e.g. Redis briefly down)

**Walkthrough:**

- T=0ms: Guest A starts (Redis call errors out → app proceeds, considers it "not held")
- T=1ms: Guest B starts (same — Redis errored)
- T=2ms: Guest A's txn acquires unit lock first
- T=3ms: Guest B's txn waits for lock
- T=10ms: Guest A's recheck passes, INSERT booking_items succeeds, COMMIT
- T=11ms: Guest B acquires lock, recheck finds Guest A's row → ROLLBACK → 409

Result: Guest A books. Guest B gets clean 409 (~1 second total). No double-booking.

### Scenario C: Lock acquired but lock-holder process crashes

Postgres releases locks when a connection dies. The lock-waiter unblocks, finds the partially-committed state (or no committed state if crash was before COMMIT), proceeds normally.

If app crashed _between_ COMMIT and the post-commit Stripe PaymentIntent call:

- DB has a `stripe_hold` booking
- No PaymentIntent exists
- BullMQ sweeper hits 15-min expiry → marks `EXPIRED`, releases inventory
- Self-heals within 15 min

### Scenario D: Stripe webhook arrives for an EXPIRED booking

Race: payment succeeded just before our 15-min expiry; webhook arrived after we expired the booking.

**Handler logic:**

```ts
if (booking.status === 'expired') {
  // Inventory was released. Refund the charge.
  await stripe.refunds.create({ payment_intent: event.data.id });
  await notifyGuest('Apology: payment processed but stay expired. Refund issued.');
  logger.error('expired-but-paid', { bookingId, paymentIntentId });
  // Alert: if this happens often, sweeper interval too aggressive
}
```

Rare, but handled. We never silently lose a guest's money.

### Scenario E: Partial unique index throws (Layer 3 fires)

This should NEVER happen if Layers 1-2 work. If it does, it means a logic bug.

```ts
try {
  await db.insert(booking_items).values(...);
} catch (e) {
  if (e.code === '23505' && e.constraint === 'booking_items_unit_night_active_uq') {
    // P0: layers 1-2 failed. Alert immediately.
    logger.fatal('DOUBLE_BOOKING_PREVENTED_BY_INDEX', { unit_id, night, ... });
    alerts.send('p0', 'Double-booking attempt slipped past app locks. Investigate.');
    return clientError('That bed is no longer available.');
  }
  throw e;
}
```

User gets a clean error. Tara gets paged. Bug gets fixed within hours.

### Scenario F: Deadlock between two transactions

Possible if we ever fail to `ORDER BY id` when locking multiple units. Postgres detects the cycle and aborts one transaction.

```ts
try {
  await runTransaction(...);
} catch (e) {
  if (e.code === '40P01') { // deadlock_detected
    logger.warn('deadlock retried', { ... });
    return retry(once); // single retry; if still deadlocks, surface error
  }
  throw e;
}
```

With proper `ORDER BY` discipline, this should never fire. The retry is insurance against a future bug.

---

## The Redis hold detail

```ts
// On hold creation (one Redis op per unit-night)
const keys = unitIds.flatMap((id) =>
  nights.map((n) => `hold:unit:${id}:${n.toISOString().slice(0, 10)}`),
);

// Use Redis MULTI/EXEC for atomicity across all keys
const result = await redis
  .multi()
  .set(keys[0], bookingId, 'NX', 'EX', 900)
  .set(keys[1], bookingId, 'NX', 'EX', 900)
  // ...
  .exec();

// If any SET returned null, someone else held one of these slots
const failed = result.some(([_, v]) => v === null);
if (failed) {
  // Release any keys we DID grab
  await redis.del(...keysWeAcquired);
  throw new ConflictError('Some beds were just taken. Please retry.');
}
```

**Edge case:** what if our app crashes between SET and the DB transaction? Redis keys stay until TTL. Other guests are blocked for up to 15 min unnecessarily. Acceptable cost for a rare crash; not worth more complex compensating logic.

---

## Testing — the non-negotiable suite

These tests run on every PR. If any flakes, **stop and fix it.** Flaky concurrency tests = bugs hiding.

### Test 1: Single-bed contention

```ts
test('100 concurrent attempts on the last bed → exactly 1 succeeds', async () => {
  const unit = await createUnit();
  const results = await Promise.allSettled(
    Array.from({ length: 100 }, () => bookUnit({ unitId: unit.id, checkIn, checkOut })),
  );
  const successes = results.filter((r) => r.status === 'fulfilled');
  const failures = results.filter((r) => r.status === 'rejected');

  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(99);
  // All failures should be clean ConflictErrors, not 500s
  failures.forEach((f) => expect(f.reason).toBeInstanceOf(ConflictError));

  // DB invariant: exactly 1 active booking_item exists for this unit-night
  const items = await db
    .select()
    .from(booking_items)
    .where(eq(unit_id, unit.id))
    .where(eq(active, true));
  expect(items).toHaveLength(checkOut.diff(checkIn, 'days'));
});
```

### Test 2: Multi-bed contention with overlap

Two guests, each requesting 3 of the same 5 dorm beds. Exactly one should win all 3 of their requested beds; the other should fail entirely (not partially).

### Test 3: Hold expiry behavior

Create a hold. Wait 16 minutes (or fake the clock). Verify:

- Booking marked EXPIRED
- booking_items rows have active=false
- Same beds bookable by new guest immediately

### Test 4: Webhook idempotency

Fire the same `payment_intent.succeeded` event 5 times. Verify booking transitions exactly once.

### Test 5: Deadlock prevention via consistent ordering

Two transactions, each locking units `[A, B]` and `[B, A]` respectively. With `ORDER BY id`, both should serialize cleanly (no deadlock).

### Test 6: Partial unique index physical guarantee

Manually disable app-level locks (test-only flag). Run 50 parallel attempts. Verify:

- Exactly 1 succeeds
- Other 49 fail with constraint violation (caught and surfaced as 409)
- No double-booking in DB

### Test 7: Redis-down resilience

Simulate Redis being unavailable. Verify bookings still work (slower, no early-warning UX), no double-booking.

---

## Performance under load

| Scenario                                              | Target latency | Throughput                 |
| ----------------------------------------------------- | -------------- | -------------------------- |
| Hold acquisition (Redis + DB lock + recheck + INSERT) | p95 < 50ms     | 500 req/sec                |
| Lock contention on same unit (worst case)             | p99 < 2s       | N/A (serialized by design) |
| Hold release on payment success                       | p95 < 20ms     | 500 req/sec                |

If lock contention p99 ever exceeds 2 sec at our load, we have a hot-bed problem. Mitigations: more granular caching, sharded inventory pools (Phase D+).

---

## Operational monitoring

Three metrics to watch in Grafana:

1. **`booking.conflict.rate`** — count of 409s per minute. Spikes indicate viral hostel listings (good) or someone attacking us (bad).
2. **`booking.lock.wait_time_ms`** — p95 of how long transactions wait for unit locks. Should be <50ms. >500ms = problem.
3. **`booking.double_booking_index_violation`** — count of Layer 3 firings. Should be ZERO ever. >0 = P0.

Alerts wired to Discord. The 3rd one pages the founder (overnight if needed).

---

## What we deliberately don't do

| Technique                                   | Why not                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `SERIALIZABLE` isolation level              | Adds overhead; READ COMMITTED + explicit locking is sufficient and faster                         |
| Advisory locks (`pg_advisory_lock`)         | Row locks scope better; advisory locks need global keying that's brittle                          |
| Optimistic locking (version columns)        | Booking inventory is heavily contended; optimistic = many retries; pessimistic wins for this case |
| Distributed locks (Zookeeper, etcd)         | Overkill; Postgres single-node handles our scale                                                  |
| Sharded inventory pools (one bed per shard) | Phase D+ if needed; current architecture handles 10k+ daily bookings on single Postgres           |

---

## Migration plan for the `active` denormalization

Currently `booking_items` doesn't have an `active` column. Adding it requires:

1. Migration: `ALTER TABLE booking_items ADD COLUMN active boolean NOT NULL DEFAULT true;`
2. Backfill: `UPDATE booking_items SET active = (booking_id IN (...))` based on current statuses
3. Create the trigger
4. Create the partial unique index (will be empty initially, fast)
5. Switch reads to use `active` column instead of joining bookings table (perf win)

Backwards-compatible. Can ship in a single deploy.

---

## When this doc changes

- Add new failure scenarios as they're discovered in production
- Update SQL if schema changes
- Any change to the locking strategy requires an ADR
- New tests get added to the concurrency suite; flakes get fixed immediately
