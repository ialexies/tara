# 04 — Booking Lifecycle

The state machine a booking moves through, from "guest clicked Book" to "stay completed." Both payment modes (Stripe + manual) are unified here.

> Read [`glossary.md`](glossary.md), [`01-inventory.md`](01-inventory.md), [`02-availability.md`](02-availability.md) first. Manual vs Stripe modes are defined in [ADR-0005](../adr/0005-payment-modes-per-property.md).

This is **the most-touched workflow in the system.** Every booking goes through it. Every customer-facing bug lives here. Every dispute traces back to a state transition.

---

## The unified state machine

```
                              ┌─────────┐
                              │  QUOTE  │  (ephemeral — not stored)
                              └────┬────┘
                                   │ click "Book"
                                   ▼
              ┌────────────────────┴──────────────────────┐
              │  stripe-mode property        manual-mode property
              ▼                                            ▼
        ┌──────────┐                              ┌────────────────────┐
        │ STRIPE_  │                              │  MANUAL_PENDING    │
        │ HOLD     │                              │  (reference shown) │
        └────┬─────┘                              └─────────┬──────────┘
             │                                              │ guest uploads
             │ 15 min                                       │ payment proof
             ├─→ EXPIRED                                    ▼
             │                                  ┌──────────────────────┐
             │ payment.succeeded webhook        │ AWAITING_            │
             │                                  │ VERIFICATION         │
             │ payment fails                    └─────┬────────────────┘
             ├─→ FAILED                               │
             │                                        │ owner confirms
             ▼                                        ▼
       ┌─────────────────────────────────────────────────┐
       │                  CONFIRMED                       │
       │                                                  │
       │  inventory reserved · owner notified ·           │
       │  guest emailed · audit event written             │
       └─────────────────┬───────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────────┐
       │                 │                     │
       │ check-in day    │ guest/owner         │ owner says
       │                 │ cancels             │ "not received"
       ▼                 ▼                     ▼  (manual mode only)
  ┌──────────┐    ┌──────────────┐      ┌─────────────┐
  │ CHECKED_ │    │ CANCELLED    │      │ DISPUTED    │
  │ IN       │    └──────┬───────┘      └──────┬──────┘
  └────┬─────┘           │                     │ founder mediates
       │ check-out day   │ refund per          ├─→ CONFIRMED
       ▼                 │ policy              └─→ CANCELLED
  ┌──────────┐           ▼
  │ CHECKED_ │    ┌──────────────┐
  │ OUT      │    │  REFUNDED    │
  └────┬─────┘    └──────┬───────┘
       │                 │
       │                 │
       ▼                 ▼
  ┌──────────────────────────┐
  │       TERMINAL           │
  │  (no more transitions)   │
  └──────────────────────────┘

Also terminal: EXPIRED, FAILED, AUTO_CANCELLED (48h manual SLA exceeded)
```

Terminal states: `CHECKED_OUT`, `REFUNDED`, `EXPIRED`, `FAILED`, `AUTO_CANCELLED`. Once there, no transitions back. Reactivation = create a new booking.

---

## State definitions

| State                   | Inventory consumed?                             | Money state                                  | Visible to guest?         | Visible to owner?              |
| ----------------------- | ----------------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------------ |
| `STRIPE_HOLD`           | Yes (Redis + booking_items)                     | PaymentIntent created, awaiting confirmation | Yes (in checkout)         | Yes (badge: "pending payment") |
| `MANUAL_PENDING`        | Yes (booking_items, no Redis lock — DB handles) | None held                                    | Yes (instructions shown)  | Yes (no action yet)            |
| `AWAITING_VERIFICATION` | Yes                                             | None held by Tara                            | Yes ("waiting for owner") | Yes (**action required**)      |
| `CONFIRMED`             | Yes                                             | Held by Stripe / verified by owner           | Yes                       | Yes                            |
| `CHECKED_IN`            | Yes                                             | Held by Stripe (countdown to release)        | Yes                       | Yes                            |
| `CHECKED_OUT`           | Released (past dates)                           | Released to owner via Stripe transfer        | Yes (in history)          | Yes (in history)               |
| `DISPUTED`              | Yes (frozen pending resolution)                 | Held / N/A                                   | Yes (with notice)         | Yes (with notice)              |
| `CANCELLED`             | Released                                        | Refund pending                               | Yes                       | Yes                            |
| `REFUNDED`              | Released                                        | Refund completed                             | Yes (in history)          | Yes (in history)               |
| `EXPIRED`               | Released                                        | None (never charged)                         | No (treated as deleted)   | No                             |
| `FAILED`                | Released                                        | None (charge failed)                         | No                        | No                             |
| `AUTO_CANCELLED`        | Released                                        | None                                         | Yes (with notice)         | Yes (with notice)              |

---

## Transitions with their side effects

Each transition has a precise set of side effects. The transition handler in `packages/booking` runs ALL of them in order; if any fail, the transition fails and the state stays put.

### Transition: `(none)` → `STRIPE_HOLD` (Stripe mode)

**Trigger:** Guest clicks "Book" on a stripe-mode property.

**Side effects (in transaction):**

1. Validate inputs (units exist, dates valid, property active)
2. `SELECT ... FOR UPDATE` on requested units
3. Verify availability (no overlapping active booking_items)
4. INSERT booking with `status='stripe_hold'`, `expires_at=now()+15min`
5. INSERT booking_items (one per unit per night), `rate_minor` locked from current pricing
6. Set Redis hold keys `hold:unit:<id>:<night> EX 900`
7. Create Stripe PaymentIntent with destination charge metadata
8. INSERT booking_event row (audit)
9. Return PaymentIntent client secret to frontend

**Fails if:** any unit becomes unavailable mid-transaction → rollback, return 409.

### Transition: `(none)` → `MANUAL_PENDING` (Manual mode)

**Trigger:** Guest clicks "Book" on a manual-mode property.

**Side effects (in transaction):**

1. Same inventory validation as above
2. INSERT booking with `status='manual_pending'`, `manual_reference_code='TARA-AAAA-BBBB'` (generated)
3. INSERT booking_items
4. INSERT booking_event row
5. (No Stripe; no Redis hold needed — DB lock is sufficient since no payment race)
6. Email guest with payment instructions + reference code

**Note:** No `expires_at` here; expiry only kicks in after `AWAITING_VERIFICATION` (48h SLA).

### Transition: `STRIPE_HOLD` → `CONFIRMED`

**Trigger:** Stripe webhook `payment_intent.succeeded`.

**Side effects (in transaction):**

1. Verify Stripe webhook signature
2. Idempotency check (this event_id already processed? skip)
3. Fetch booking by PaymentIntent ID
4. Verify booking is still in `STRIPE_HOLD` (not expired/failed)
5. UPDATE booking SET status='confirmed', confirmed_at=now()
6. UPDATE booking_items SET active=true (was already, but defensive)
7. DEL Redis hold keys
8. INSERT booking_event row
9. Enqueue: send confirmation email to guest
10. Enqueue: notify owner (email + WhatsApp + in-app)
11. Schedule BullMQ job: trigger payout 24h after check-in date

### Transition: `MANUAL_PENDING` → `AWAITING_VERIFICATION`

**Trigger:** Guest uploads payment screenshot + reference ID.

**Side effects:**

1. Validate screenshot (file type, size; antivirus optional Phase C+)
2. Upload to Cloudflare R2
3. UPDATE booking SET status='awaiting_verification', guest_screenshot_url=..., guest_reported_reference=...
4. Set verification_sla_at = now() + 24 hours
5. INSERT booking_event row
6. Notify owner (email + WhatsApp + in-app — **critical priority**)
7. Schedule BullMQ job: escalate to founder if no owner response in 24h, auto-cancel at 48h

### Transition: `AWAITING_VERIFICATION` → `CONFIRMED`

**Trigger:** Owner clicks "Confirm received" in dashboard.

**Side effects:**

1. Verify clicker is the property owner
2. UPDATE booking SET status='confirmed', owner_verified_at=now(), owner_verified_by=$user_id
3. INSERT booking_event row
4. Cancel any scheduled escalation/auto-cancel jobs
5. Enqueue: send confirmation email to guest
6. (No payout schedule — manual mode = no money flow through Tara)

### Transition: `AWAITING_VERIFICATION` → `DISPUTED`

**Trigger:** Owner clicks "Not received" in dashboard.

**Side effects:**

1. UPDATE booking SET status='disputed', dispute_opened_at=now()
2. INSERT booking_event row with notes
3. Notify founder immediately (Discord + email — **critical priority**)
4. Notify guest (gentle wording: "Property is verifying your payment")
5. Cancel auto-cancel job (founder will resolve manually)

### Transition: `DISPUTED` → `CONFIRMED` or `CANCELLED`

**Trigger:** Founder resolves via admin UI.

**Side effects:**

1. UPDATE booking SET status=<resolved>, dispute_resolution=<notes>
2. INSERT booking_event row with founder notes
3. Notify both guest and owner with resolution
4. If cancelled: release inventory (UPDATE booking_items SET active=false), no refund (Tara never had the money)

### Transition: `AWAITING_VERIFICATION` → `AUTO_CANCELLED`

**Trigger:** BullMQ sweeper, 48h SLA exceeded with no owner action.

**Side effects:**

1. UPDATE booking SET status='auto_cancelled'
2. UPDATE booking_items SET active=false (inventory released)
3. INSERT booking_event row
4. Notify guest (apology + suggest contacting owner directly or trying another property)
5. Notify founder (Discord — owner unresponsive, may need outreach)

### Transition: `STRIPE_HOLD` → `EXPIRED`

**Trigger:** BullMQ sweeper, 15 min passed, no `payment_intent.succeeded`.

**Side effects:**

1. UPDATE booking SET status='expired'
2. UPDATE booking_items SET active=false
3. Cancel the Stripe PaymentIntent (cleanup)
4. DEL Redis hold keys
5. INSERT booking_event row
6. (No notification — guest abandoned checkout intentionally)

### Transition: `STRIPE_HOLD` → `FAILED`

**Trigger:** Stripe webhook `payment_intent.payment_failed`.

**Side effects:**

1. UPDATE booking SET status='failed', failure_reason=...
2. UPDATE booking_items SET active=false
3. DEL Redis hold keys
4. INSERT booking_event row
5. Notify guest (with explanation + retry link if applicable)

### Transition: `CONFIRMED` → `CANCELLED`

**Trigger:** Guest clicks "Cancel" OR Owner clicks "Cancel from my side" OR Founder admin action.

**Side effects:**

1. Verify actor has permission
2. Apply cancellation policy to compute refund amount:
   - `flexible`: full refund if >24h before check-in
   - `moderate`: full refund if >5 days, 50% if 1-5 days, 0% if <1 day
   - `strict`: 50% refund if >7 days, 0% otherwise
3. UPDATE booking SET status='cancelled', cancellation_reason=..., refund_due_minor=...
4. UPDATE booking_items SET active=false (inventory released immediately)
5. INSERT booking_event row
6. If Stripe mode + refund > 0: schedule refund job
7. Notify both parties

### Transition: `CANCELLED` → `REFUNDED`

**Trigger:** BullMQ job processes the refund (Stripe `refunds.create`).

**Side effects:**

1. Idempotency check
2. Call Stripe to issue refund
3. UPDATE booking SET status='refunded', refunded_at=now(), refunded_amount_minor=...
4. INSERT booking_event row
5. Notify guest with refund receipt

### Transition: `CONFIRMED` → `CHECKED_IN`

**Trigger:** Owner clicks "Mark checked-in" in dashboard, OR auto-flips on check-in date noon.

**Side effects:**

1. UPDATE booking SET status='checked_in', checked_in_at=now()
2. INSERT booking_event row
3. (Stripe mode) Trigger payout schedule confirmation — funds released 24h from now
4. Notify guest with check-in welcome (review link comes later, after checkout)

### Transition: `CHECKED_IN` → `CHECKED_OUT`

**Trigger:** Owner clicks "Mark checked-out", OR auto-flips on check-out date noon.

**Side effects:**

1. UPDATE booking SET status='checked_out', checked_out_at=now()
2. INSERT booking_event row
3. Schedule: review request email at T+24h
4. (Stripe mode, if not already released): trigger Stripe transfer to owner's connected account

---

## The `booking_events` audit table

Every transition writes one row. This is **append-only, never updated, never deleted.** Source of truth for disputes, debugging, replays.

```sql
CREATE TABLE booking_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(id),
  tenant_id     text NOT NULL,
  event_type    text NOT NULL,   -- 'created', 'confirmed', 'cancelled', 'refunded', etc.
  from_state    text,            -- previous status, null if creation
  to_state      text NOT NULL,
  actor_type    text NOT NULL,   -- 'guest' | 'owner' | 'admin' | 'system' | 'stripe' | 'sweeper'
  actor_user_id uuid,            -- nullable for system actors
  metadata      jsonb NOT NULL DEFAULT '{}',  -- arbitrary context per event type
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_events_booking_idx ON booking_events(booking_id, created_at);
CREATE INDEX booking_events_tenant_idx ON booking_events(tenant_id, created_at);
```

**Why this matters:**

- Disputes: "When did the owner mark this checked-in?" — query event log
- Debugging: "Why is this booking in DISPUTED?" — replay events
- Analytics: average time from `STRIPE_HOLD` → `CONFIRMED`, drop-off rates
- Compliance: PH Data Privacy Act audit requirements

We're **not** doing full event sourcing (events as source of truth, state derived). We're using events as an audit trail next to the canonical `bookings.status` column. Simpler, faster reads, still gives us 95% of event-sourcing's benefits.

---

## Cancellation policies (canonical)

Three tiers, owner picks per property. Stored as enum on property.

| Policy            | Refund rules                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `flexible`        | Full refund if cancelled >24h before check-in. 0% within 24h.    |
| `moderate`        | Full refund >5 days. 50% from 5 days down to 24h. 0% within 24h. |
| `strict`          | 50% refund >7 days. 0% within 7 days.                            |
| (future) `custom` | Phase D — owner defines own rules. Not in MVP.                   |

These are the ONLY refund rules the system computes. Anything else (owner offers a one-off goodwill refund, etc.) requires the founder to intervene via admin.

**Computation happens in `packages/booking/cancellation.ts`** — pure function, well-tested with property-based tests against edge cases.

---

## The sweeper jobs (BullMQ)

Four scheduled jobs maintain integrity:

| Job                             | Schedule          | What it does                                                                                       |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `expireStripeHolds`             | Every 1 min       | Find `STRIPE_HOLD` bookings past `expires_at`, transition to `EXPIRED`                             |
| `escalateUnverifiedManual`      | Every 5 min       | Find `AWAITING_VERIFICATION` past 24h SLA → notify founder                                         |
| `autoCancelStaleManual`         | Every 5 min       | Find `AWAITING_VERIFICATION` past 48h → transition to `AUTO_CANCELLED`                             |
| `autoCheckin` (optional, defer) | Daily at noon PHT | Auto-flip `CONFIRMED` → `CHECKED_IN` on check-in date. Phase C+ — owners manually flip in Phase B. |

All jobs are **idempotent**. Running them twice on the same booking is safe (state check at start).

---

## Invariants enforced (in code + tests)

Non-negotiable rules. Tested in `packages/booking/__tests__/lifecycle.test.ts`.

1. **No state regression.** `CONFIRMED` cannot go back to `STRIPE_HOLD`. The transition handler rejects illegal transitions.
2. **Inventory consistency.** When booking becomes terminal-non-fulfilled (EXPIRED/FAILED/CANCELLED/AUTO_CANCELLED), all its booking_items become inactive within the same transaction.
3. **Event audit.** Every state transition writes a booking_event row. If event insert fails, the transition fails.
4. **Tenant isolation.** All booking_event rows include tenant_id, denormalized from booking.
5. **Idempotent webhooks.** Stripe webhook handler checks if `event_id` was already processed (separate `processed_stripe_events` table) and short-circuits if so.
6. **Idempotent transitions.** Calling `transition(booking, to='confirmed')` on an already-confirmed booking is a no-op (logs warning, returns success).
7. **Cancellation policy is locked at booking time.** If owner changes policy on the property later, existing bookings keep their original policy.

---

## Edge cases you'll lose sleep over

### Stripe webhook arrives before our request returns

Race: app creates the PaymentIntent, returns client_secret to browser, but before app's local INSERT commits, the user pays instantly (test card, fast), and Stripe webhook fires.

**Fix:** Webhook handler uses upsert pattern — if booking exists, transition it; if not, queue the event for retry (60 sec delay) and check again. Worst case: brief inconsistency, resolved on retry.

### Network partition between Stripe and us during charge

User paid; we never got the webhook (Stripe will retry). Our booking stays in `STRIPE_HOLD`, sweeper hits expiry, marks `EXPIRED`. Then 5 minutes later the webhook arrives.

**Fix:** Webhook handler checks the booking state. If `EXPIRED`, we already released inventory. We must:

1. Refund the charge (Stripe `refunds.create`)
2. Notify guest of the failed booking + automatic refund
3. Log a P1 — this should be rare; if it happens often, sweeper interval is too aggressive

### Owner marks "Confirm received" but the GCash payment was a chargeback

Manual mode hazard. Tara has no insight into GCash's records.

**Fix:** This is owner's risk by design (per ADR-0005). Owner Agreement makes this explicit. We don't refund.

### Double-click: owner clicks "Confirm received" twice fast

**Fix:** Idempotent transition (see invariant 6). Second click is a no-op.

### Property is deleted while booking exists

Cascade delete would corrupt history.

**Fix:** Properties use soft-delete (`deleted_at` column). Active bookings prevent hard-delete; system refuses with clear error.

### Guest tries to book during the brief moment between hold expiry and Redis key deletion

**Fix:** DB is source of truth. The `SELECT ... FOR UPDATE` on units + recheck booking_items inside the new transaction catches it. Redis is a hint, not authoritative.

---

## Testing plan

Critical paths (all in CI, must pass on every PR):

1. **Happy path Stripe:** Quote → Hold → Paid → Confirmed → CheckedIn → CheckedOut
2. **Happy path manual:** Quote → Pending → Verification → Confirmed → CheckedIn → CheckedOut
3. **Hold expiry:** Stripe hold sits 16 min → Expired, inventory released
4. **Manual SLA:** Pending → uploaded → 49h passes → Auto-cancelled
5. **Cancellation tiers:** for each policy × each cutoff boundary, refund amount correct
6. **Concurrent booking on last bed:** 50 parallel attempts, exactly 1 succeeds
7. **Webhook idempotency:** same Stripe event fired 3 times, only 1 transition happens
8. **Dispute resolution:** Disputed → founder confirms → Confirmed; Disputed → founder rejects → Cancelled (no refund)
9. **State regression rejected:** attempt Confirmed → Hold returns 422
10. **Tenant isolation:** owner A cannot transition owner B's booking

Property-based tests for cancellation math (use `fast-check`):

```ts
fc.assert(
  fc.property(
    fc.date({ min: tomorrow, max: in60days }), // check_in
    fc.date({ min: today, max: tomorrow }), // cancellation moment
    fc.constantFrom('flexible', 'moderate', 'strict'),
    fc.integer({ min: 100, max: 100000 }), // booking total
    (checkIn, cancelAt, policy, totalMinor) => {
      const refund = computeRefund({ checkIn, cancelAt, policy, totalMinor });
      // Properties:
      expect(refund).toBeGreaterThanOrEqual(0);
      expect(refund).toBeLessThanOrEqual(totalMinor);
      // Within hours-before-checkin = always 0 for strict
      if (policy === 'strict' && hoursBetween(cancelAt, checkIn) < 168) {
        expect(refund).toBe(0);
      }
    },
  ),
);
```

---

## What's deliberately deferred

| Feature                                             | Phase                      | Why                                                          |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| Booking modification (change dates)                 | C+                         | Phase B: cancel + rebook                                     |
| Partial cancellation (release 1 of 4 beds booked)   | C+                         | Complex, rare                                                |
| Guest-side instant cancel without owner approval    | always (allowed by policy) | Owner approval ≠ required for cancel; policy dictates refund |
| Long-stay rate adjustments mid-booking              | D+                         | Rare, edge case                                              |
| Group booking (one booking, multiple guests' names) | 2                          | UX-only; the lead guest holds the contract                   |

---

## When this doc changes

1. Update the state machine diagram if states added/removed
2. Update `booking_events.event_type` enum if new transitions added
3. Add tests for new transitions
4. If a transition's side effects change, document the migration plan for in-flight bookings
5. ADR if a structural change (e.g. moving to full event sourcing)
