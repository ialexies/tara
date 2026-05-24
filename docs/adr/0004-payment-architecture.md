# ADR-0004: Payment architecture — Stripe Connect Express + destination charges

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

Tara facilitates money flow from guests to property owners. Three things determine the architecture:

1. **Legal exposure.** Forwarding money between two parties without proper structure makes you an unlicensed money transmitter. In the US that's per-state licensing. In the Philippines, BSP's OPS (Operators of Payment Systems) registration applies. EU has PSD2.
2. **Marketplace requirements.** Tara needs to hold funds during a "trust window" (24h after check-in), enforce cancellation policies, handle disputes centrally, and take a commission.
3. **PH owner reality.** PH small hostel owners have variable readiness — many won't pass full Stripe KYC immediately, but most can do lightweight onboarding.

Stripe Connect launched payouts in Philippines in 2024 with PHP support.

See also: [`payments_architecture.md`](../../../C--Users-alexi/memory/payments_architecture.md) memory (canonical decision record carried across sessions).

## Decision

**Use Stripe Connect with Express connected accounts and destination charges.**

- Each property owner has a Stripe Connected Account (`acct_xxxxx`) of type **Express**, created and managed under Tara's platform account
- Owners onboard via Stripe's hosted onboarding flow (`account_links` API)
- Guest payments use **destination charges**: payment flows to Tara's platform account, then transfers to the connected account on Tara's schedule (24h after check-in, minus commission)
- Tara collects commission by retaining a portion (`application_fee_amount`) when transferring

```
Guest pays ₱5,000 → Tara platform account (holding)
                         │
                         │ 24h after check-in
                         ├──► Transfer ₱4,500 → Owner's connected account
                         └──► ₱500 commission stays in platform balance
                              │
                              ▼ (Stripe payout schedule, 1-2 days)
                              Owner's bank / GCash / Maya
```

## Alternatives considered

- **Single shared Stripe account** — Rejected. Acting as unlicensed money transmitter; cannot track per-owner revenue cleanly; cannot file per-owner tax forms; cannot pay out automatically. Legal landmine.

- **Standard Connect** (owner has full Stripe account, Tara takes app fee) — Rejected. No holding period control; owner handles disputes/refunds alone (bad for small PH hostels); heavier owner KYC (lower completion); card statements show owner's name not Tara's; refunds require owner cooperation.

- **Separate charges and transfers** (more flexible variant of Connect) — Passed for now. More control but more complexity. Destination charges cover our needs. Revisit if we need complex multi-party splits (e.g., bundled tours from a different operator).

- **PayMongo Connect** (PH local alternative) — Rejected as primary; reserved as fallback. PayMongo has good PH local payment method support (GCash, GrabPay direct) but smaller ecosystem and less mature Connect product. If we hit cases where Stripe Connect Express won't onboard a PH owner, PayMongo is the fallback (see ADR-0005).

## Consequences

**Positive**

- Stripe acts as the regulated money transmitter — Tara doesn't need money transmitter licenses
- Tara controls holding periods and refund timing (enforces cancellation policy unilaterally)
- Disputes are managed centrally on Tara's account; Stripe Radar protects all properties
- Lightweight Express KYC = higher PH owner onboarding completion vs Standard Connect
- Card statements show "TARA" → consistent brand experience
- Stripe handles per-owner tax form generation automatically
- PHP payouts to PH banks + GCash supported natively

**Negative / trade-offs**

- Tara is responsible for PCI compliance scope (mitigated: SAQ-A by using Stripe Elements only — never touching raw card data)
- Connect adds API complexity vs single-account Stripe
- Owners see only the limited "Express Dashboard" — some advanced owners may want more
- Stripe fees apply to Tara's account (~2.9% + ₱15 per transaction in PH)

**Neutral / things to watch**

- Stripe's PH product is newer than US/EU — watch for payout method gaps (e.g., some PH banks may not be supported yet)
- Owner KYC requirements evolve — what works today might require more documents in 6 months
- If Stripe ever pulls out of PH or pricing changes radically, PayMongo fallback becomes primary

## Implementation notes

- Owner record extension: `stripe_connect_account_id text`, `stripe_onboarding_status enum`
- Owner cannot transition from `Drafted` → `Active` lifecycle state until `stripe_onboarding_status = 'active'` (driven by Stripe webhook `account.updated`)
- All payment flows use Stripe Elements client-side (PCI SAQ-A)
- Webhook signature verification is mandatory (no unsigned events processed)
- Idempotency keys on all create/modify operations

## References

- [Stripe Connect docs](https://stripe.com/docs/connect)
- [Stripe Connect Philippines support](https://stripe.com/global/philippines)
- [ADR-0005 — Payment modes per property](0005-payment-modes-per-property.md) — the Phase B on-ramp for owners who can't pass Stripe KYC yet
- Memory: `payments_architecture.md` (decision context across sessions)
