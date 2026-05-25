# ADR-0005: Payment modes per property — manual vs Stripe

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

[ADR-0004](0004-payment-architecture.md) commits us to Stripe Connect Express as the payment architecture. But Phase A-B (Months 0-12) has a real onboarding problem in the Philippines:

> Most small PH hostel owners won't go through Stripe Connect onboarding (ID upload, bank/GCash linking) **until they trust that Tara actually brings them bookings.** It's a chicken-and-egg: they want to see results before investing in setup; we can't show them results until they're set up.

We need a way for owners to **list and receive bookings with zero new tooling** — using only what they already have (GCash / Maya / personal bank). Once they see Tara works, they're motivated to upgrade to Stripe Connect for automated payouts.

This is the supply-side bootstrap mechanism. Without it, Phase B is unworkable.

See [`payment_modes.md`](../../../C--Users-alexi/memory/payment_modes.md) memory for the full decision context.

## Decision

**Each property has a `payment_mode` field with two values: `'manual'` and `'stripe'`.**

### Manual mode

- Default for newly-listed properties in Phase B
- Guest pays the owner directly via GCash / Maya / bank (Tara never touches the money)
- Guest uploads a screenshot + reference ID after paying
- Owner verifies receipt in their GCash app and marks the booking confirmed in dashboard
- Tara provides a unique booking reference per booking (`TARA-A8X9-2K4M`) so owner can match payment in their bank/wallet log
- 24h SLA for owner verification; 48h auto-cancel + founder escalation if no response
- **No commission charged in Phase B** (Tara absorbs cost as supply-side acquisition)
- Phase D options for monetizing manual mode: owner monthly subscription (~₱500-1,000/mo) OR a small guest-side booking fee (~₱50) collected by Tara via Stripe separately

### Stripe mode

- Default for new properties in Phase C+ (public listings)
- Full ADR-0004 flow: Stripe Connect Express, destination charges, 24h hold, 10% commission, automated payouts
- Required for any property that wants to participate in the commission economy

### Mode transition

- An owner can switch a property from `manual` → `stripe` once their `stripe_onboarding_status = 'active'`
- Switching `stripe` → `manual` is allowed (owner choice) but discouraged in copy
- Mode applies per property; an owner with multiple properties can mix modes (rare but possible)

## Alternatives considered

- **Reject all owners who can't pass Stripe KYC** — Cleanest architecture but loses the most underserved (and most receptive) owners. Defeats Phase B strategy.
- **Tara collects all payments via PayMongo for non-Stripe owners, manually pays out via GCash** — Considered seriously. Preserves Tara's control (holding period, refunds, disputes) and unlocks commission collection. But: adds ops burden, adds compliance burden (Tara is now holding money for these owners), requires PayMongo Connect integration upfront. Rejected for MVP; reconsider in Phase C if manual mode disputes become frequent.
- **Cash-on-arrival only for non-Stripe owners** — No upfront payment commitment from guest. Higher no-show risk, worse for owners. Rejected.

## Consequences

**Positive**

- Owners onboard in minutes with zero new tooling — biggest unlock for Phase B supply growth
- Owners stay in their familiar workflow (check GCash daily, like they already do)
- Tara has zero compliance burden on manual-mode transactions (no money flowing through Tara)
- Cultural fit — direct GCash payment is normal in PH
- Natural upgrade path: owner sees bookings → motivated to set up Stripe → graduates to commission economy

**Negative / trade-offs**

- Tara can't enforce cancellation policy in manual mode (no money to refund)
- Tara can't unilaterally resolve disputes — founder mediation only in Phase B
- Guest protection is weaker — guests must be clearly told "you're paying the property directly"
- No revenue from manual-mode bookings in Phase B (acceptable as customer acquisition cost)
- Fraud surface area: fake screenshots, replayed references, denied receipt
- Founder-mediated disputes will not scale beyond ~50-100 properties — needs replacement in Phase C+

**Neutral / things to watch**

- Public reviews must mention payment experience so bad owners are visible
- Manual mode discoverability — should it be marked clearly to guests? (probably yes; "Direct booking" badge)
- GCash/Maya chargebacks are the owner's risk to defend; Tara terms must make this explicit
- Watch the conversion rate from `manual` → `stripe` over time — if it stays low, manual mode is a permanent product, not a bridge

## Implementation notes

### Booking state additions

The booking state machine gains manual-mode states:

```
ManualPending → AwaitingVerification
                  ├─→ Confirmed         (owner confirms received)
                  ├─→ Disputed          (owner says not received, founder mediates)
                  └─→ AutoCancelled     (48h no owner response)
```

### Data model additions

```ts
// On property:
payment_mode: 'manual' | 'stripe'
manual_payment_methods?: {
  gcash?:  { number: string; account_name: string }
  maya?:   { number: string; account_name: string }
  bank?:   { bank_name: string; account_number: string; account_name: string }
}

// On booking:
payment_mode: 'manual' | 'stripe'  // captured at booking time
manual_payment?: {
  reference_code: string         // 'TARA-A8X9-2K4M'
  guest_screenshot_url?: string  // R2 upload
  guest_reported_reference: string
  owner_verified_at?: Date
  owner_verified_by?: string     // user_id of confirming owner
  dispute_opened_at?: Date
  dispute_resolution?: string
}
```

### Safeguards (non-negotiable)

- Unique booking reference per booking, tied to booking ID (anti-fraud)
- Owner must explicitly confirm receipt (no auto-approve on screenshot upload)
- 24h verification SLA + 48h escalation to founder
- Manual-mode properties must be founder-verified (in-person Phase B)
- Public review system mentions payment experience (self-policing)
- Guest-facing copy is explicit: "direct payment, disputes between you and owner"

## References

- [ADR-0004 — Payment architecture (Stripe Connect)](0004-payment-architecture.md)
- Memory: `payment_modes.md`
- Memory: `business_model_phases.md` (Phase A-B context)
