# Monetization Roadmap

How Tara goes from "free to use" to "profitable platform" — **without breaking the trust that's making it work in the first place.**

> Related: `memory/business_model_phases.md` (the canonical phased plan), [`owner-onboarding.md`](owner-onboarding.md), [`affiliate-program.md`](affiliate-program.md), [`trust-and-safety.md`](trust-and-safety.md), [ADR-0005](../adr/0005-payment-modes-per-property.md).

This doc is the **economic engine plan.** When each revenue lever turns on, what it does, what it doesn't, and how to introduce it without destroying the goodwill Phase A-B built.

---

## The economic philosophy

Three principles that govern every monetization decision:

1. **Free is a feature, not a bug.** Free in Phase A-B isn't a marketing tactic — it's the only way to build trust at zero CAC. Every paid lever introduced too early is a tax on the trust we haven't yet earned.

2. **The owner is the customer that matters.** Guests pay once and leave. Owners pay forever (in commissions). Monetization that makes owners more successful builds the platform. Monetization that extracts from owners erodes it.

3. **Charge for value created, not value claimed.** A platform that brings 100 bookings/year deserves 10%. A platform that brings 0 bookings has no claim to anything. Pricing must track value delivered.

These three rule out: aggressive upsells, forced premium tiers, dark patterns, hidden fees. They favor: transparent commission, optional value-add features, clear value→price mapping.

---

## The 5 phases

This is the canonical evolution. **Same as `memory/business_model_phases.md` but expanded.**

### Phase A — Own inventory (Months 0-6)

**Revenue:** ₱0

**What's live:** founder using Tara on own/friend properties to prove the system works.

**Why no monetization:** zero traction. Charging anyone would feel hostile.

**Cost:** ~₱200/mo (infra). Out of founder pocket.

### Phase B — Free for friends (Months 6-12)

**Revenue:** ₱0 (planned loss; treat as customer acquisition cost)

**What's live:**

- 10-30 properties onboarded via founder-led, all in Zambales
- Manual payment mode dominates (per [ADR-0005](../adr/0005-payment-modes-per-property.md)) — Tara doesn't touch money
- Stripe Connect available but optional
- Tara pays Stripe fees on any Stripe-mode bookings (small absorption)

**Why no commission yet:** these are friends-of-the-founder. Asking them to pay before the platform has driven anything for them = relationship damage. We're paying for distribution.

**Owner message:** _"Tara is free for our first 30 partners in Zambales. We'll introduce a small commission later (~10%, less than half what Hostelworld charges). You'll get advance notice and a 6-month grace period."_

**Cost:** ~₱300-500/mo (infra + small SMS/WhatsApp costs).

### Phase C — Free listing + commission on bookings (Months 12-24)

**Revenue:** **first real revenue.**

**What's live:**

- Listing always free (no one pays to be listed)
- **8-10% take rate** on Stripe-mode bookings only (manual mode stays uncharged)
- **15% take rate** on tour bookings (separate operator persona — see `05-tours.md`)
- Owners can choose to upgrade Phase B → Phase C terms when they want (no force)
- New owners (Phase C and beyond) onboard directly into commission terms

**Why commission and not subscription:**

- Aligned incentives — Tara only earns when owner earns
- No fixed cost to owner (zero risk)
- Industry standard (Booking.com 15-20%, Hostelworld 15%, we undercut)
- Easier owner sell: "you literally only pay when we send you a booking"

**Why 8-10% (not higher):**

- 50% under Hostelworld's 15% — the wedge
- After Stripe fees (~3%), Tara's net is ~5-7% — sustainable, not greedy
- Room to introduce a "lower commission for Pro tier" (Phase D)

**Revenue model at Phase C end:**

```
30 active properties × 8 bookings/month avg × ₱2,500 avg booking = ₱600,000 GBV/month
Tara's 10% commission = ₱60,000 / month
Stripe fees (3% of GBV) absorbed: -₱18,000
Net Tara revenue: ₱42,000 / month
Infra cost: ₱500-2,000 / month
Net: ~₱40,000 / month (~$700)
```

Not enough to live on. **Bootstrap to Phase D.**

### Phase D — Tiered subscription + commission (Year 2-3)

**Revenue:** **scaling.**

**What's live:** add subscription tiers that **reduce commission and unlock features.**

| Tier         | Monthly       | Commission rate | Includes                                                                                                                                                        |
| ------------ | ------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**     | ₱0            | 10% on bookings | Basic listing, owner dashboard, manual mode, support via WhatsApp                                                                                               |
| **Pro**      | ₱990 (~$18)   | 7% on bookings  | Free tier + channel sync (Booking.com, Hostelworld), priority search placement, analytics dashboard, faster payouts (24h instead of 7d), custom property domain |
| **Business** | ₱2,990 (~$54) | 5% on bookings  | Pro tier + multi-property mgmt, API access, dedicated WhatsApp support, white-label custom domain, AI dynamic pricing, advanced reports                         |

**Math behind tiers:**

If owner does 20 bookings/month at ₱3000 average = ₱60k GBV:

- Free: ₱6,000 commission (10%)
- Pro: ₱990 + ₱4,200 (7%) = ₱5,190 — owner saves ₱810
- Business: ₱2,990 + ₱3,000 (5%) = ₱5,990 — owner saves ₱10 + gets features

Pro tier breakeven is exactly the inflection. Owners doing < ~15 bookings/mo stay Free. Owners doing 15-50 upgrade Pro. Heavy producers (50+ bookings) upgrade Business.

**Why this works:**

- Owners can see the math themselves
- No forced upgrades
- High-volume owners (the ones we care about most) get more value AND give Tara more
- Channel manager included in Pro = real value (saves ₱2,000-5,000/mo if they were doing manually)

**Revenue projection (year 2):**

```
100 active properties:
  60 free tier: ₱5,000 GBV/mo avg × 10% × 60 = ₱30,000/mo
  30 pro: ₱990 × 30 = ₱29,700/mo subscription + ₱60,000 × 7% × 30 ≈ ₱126,000 commission/mo
  10 business: ₱2,990 × 10 = ₱29,900/mo subscription + ₱150,000 × 5% × 10 ≈ ₱75,000 commission/mo
  Total: ₱290,000+/mo gross, ~₱200,000/mo net after Stripe fees
```

~$3,500/mo. Founder-livable. Not yet hire-able.

### Phase E — Adjacent revenue (Year 3+)

**Revenue:** **diversification.**

Adjacent products that ride on the traveler relationship:

| Product                                     | Mechanism                                                | Margin                        |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| **Travel insurance**                        | Affiliate (PH provider partnership)                      | ~15-25% commission per policy |
| **eSIM / SIM cards**                        | Affiliate (Airalo, Holafly partnership)                  | ~10-15% commission            |
| **Airport transfers**                       | Take rate on Tara-booked transfers                       | 15-20%                        |
| **Group event bookings**                    | Premium pricing (weddings, retreats, corporate offsites) | Higher margin per booking     |
| **Travel guidebook / merch**                | Direct sale                                              | Variable                      |
| **"Tara Pass" subscription for guests**     | Frequent traveler discount                               | Recurring revenue from guests |
| **B2B integrations**                        | API access fee for travel agencies / corporate bookers   | Subscription                  |
| **Channel manager for non-Tara properties** | SaaS product for owners not yet on platform              | Subscription                  |
| **White-label PMS**                         | Hostel chains licensing Tara's tech                      | Enterprise contracts          |

These are individually small. Collectively they can equal subscription revenue. **Don't chase any until the core marketplace is healthy.**

---

## The transition rules (the hard part)

The biggest risk: how do existing free owners react when paid tiers arrive?

### The "free forever for Phase B partners" promise

Owners who joined in Phase B get:

- **Free tier forever** at the same terms they joined (Phase B = $0 commission)
- **Optional opt-in** to Phase C+ tiers (with their own incentive)
- **6-month notice** before any change to their terms

This is **non-negotiable.** The first 30 owners' trust is what makes Tara possible. Honoring the original deal = brand integrity. Breaking it = brand poison that doesn't come back.

Document explicitly in their owner agreement: "You joined during Tara's free Phase B. This agreement covers your terms for as long as your account remains in good standing."

### When to flip Phase B → C commercially

**The graduation gate** (from `business_model_phases.md`):

- 100 completed bookings on platform
- Average rating ≥ 4.5
- Owner NPS ≥ 30
- Self-service onboarding works (60% completion)

Don't flip just because months have passed. Flip when product readiness justifies asking for money.

### How to introduce subscription tiers

Phase D launch sequence:

1. **Month -3:** announce internally + on blog: "Pro and Business tiers coming"
2. **Month -2:** soft launch to 5 hand-picked owners (invite only, free for first 3 months)
3. **Month -1:** collect feedback, refine pricing/features, publish FAQ
4. **Month 0:** public availability. Existing owners email: "Want to upgrade? Here's why and how. No pressure if not."
5. **Month 1-3:** monitor adoption. If <10% upgrade, pricing is wrong. If >40%, you're underpricing.
6. **Month 6:** lock in pricing for 12 months. Grandfather any later changes.

**No annual contracts.** Monthly cancel-anytime. Trust the product to retain.

---

## Anti-patterns to never do

Every founder I've seen kill their own marketplace did at least one of these:

| Anti-pattern                                                                       | Why it kills trust                                                     |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Surprise commission increase                                                       | "I built my business on 10%, now you want 15%" — owners flee           |
| Force existing free users into paid tiers                                          | Breaks original promise; even if economically justified                |
| Add fees that weren't disclosed at signup                                          | Hidden costs erode every aspect of relationship                        |
| Bait-and-switch (offer free, then add features that require paid tier to use)      | Owners feel held hostage                                               |
| Manipulate search rankings to favor paying owners                                  | Discovery becomes pay-to-play; corruption corrodes brand               |
| Charge for things that used to be free                                             | "Tara used to give me X for free, now they charge" — narrative spreads |
| Penalty pricing for non-paying owners (worse support, slower payouts)              | Punitive tiers vs additive tiers                                       |
| Annual contracts with hidden cancellation difficulty                               | Trap pricing = bad business                                            |
| Reduce commission rate to attract new owners while leaving existing on higher rate | Existing owners notice; revolt                                         |
| Add ads to the owner dashboard or booking flow                                     | Confidence killer; revenue not worth the trust loss                    |
| Sell owner contact info or guest data to third parties                             | Legal + trust death sentence                                           |

**The litmus test:** if you'd be embarrassed for owners to discover it in 2 years, don't do it now.

---

## Pricing principles

### Round numbers

₱990, ₱2,990, ₱4,990 — easier to read, feel intentional. Avoid ₱1,247.50 nonsense.

### Anchor the comparison

"Pro tier ₱990/mo" feels expensive in isolation. "Pro tier ₱990/mo includes channel manager (₱2,000-3,000/mo elsewhere) + advanced analytics" feels like a deal.

Always present pricing with the comparable alternative cost.

### Per-property or flat?

Subscription tiers above are flat per owner (covers all their properties). Owners with 5 properties pay the same as owners with 1.

Why: simpler mental model, encourages multi-property growth, avoids penalizing chains.

Phase E might revisit if heavy users abuse it.

### Currency

Subscription priced in PHP for PH owners. Phase D international = priced in local currency (or USD with locale-aware display).

### Tax-inclusive vs exclusive

PH culture is tax-inclusive in pricing (the price you see is the price you pay). Match that. "₱990/mo, VAT inclusive."

---

## Owner-side messaging templates

When introducing pricing (Phase C, Phase D):

### Phase B → Phase C transition (commission introduction)

```
Subject: Tara is graduating

Hi [name],

Six months ago you helped us start Tara. You took a chance on a new platform
when you had no reason to. We owe you everything.

We're now opening Tara to property owners across Zambales (and beyond).
With that, we're introducing a small commission on bookings:
  • New properties (joining today): 10% commission on Stripe bookings
  • Founding members (you): commission-free forever, as we promised

You don't have to change anything. Your account stays at ₱0 commission.

If you want to upgrade to the new model (which unlocks faster payouts,
analytics, etc.), you can choose to anytime in Settings → Account.

Either way, we're here. Thanks for being part of the start.

[Founder]
```

### Phase D tier launch (existing owners)

```
Subject: Pro and Business tiers are here (optional)

Hi [name],

You've done [X] bookings on Tara, [Y] total revenue. You're one of our top
hosts and we're grateful.

We're adding two paid tiers for hosts who want more:

  Pro (₱990/mo): channel sync with Booking.com + Hostelworld,
                 priority search placement, analytics, 24h payouts.
                 7% commission instead of 10%.

  Business (₱2,990/mo): everything in Pro plus multi-property, custom
                        domain, AI dynamic pricing.
                        5% commission instead of 10%.

You can stay on Free forever — that's our promise.

If you're doing 15+ bookings/month, Pro probably saves you money.
Try the math: [calculator link].

Questions? WhatsApp me directly: [founder phone].

[Founder]
```

Never automated. Always personal. Even when sent to 100 owners.

---

## Cost discipline

Revenue is half the equation. The other half is keeping costs low so net margin grows.

Cost structure to defend:

| Cost                           | Target                                       | Watch                                |
| ------------------------------ | -------------------------------------------- | ------------------------------------ |
| Infra                          | < 5% of revenue                              | Cloud bills creep; quarterly review  |
| Stripe fees                    | ~3% of GBV (eaten as cost of doing business) | Negotiable at $5k+ MRR               |
| Customer acquisition (paid)    | < ₱200 per acquired user                     | Track ROAS religiously               |
| AI cost                        | < ₱1/booking                                 | Per `ai-features.md` cost discipline |
| Personnel                      | 0 until Phase D+                             | Hire when sustainable, not earlier   |
| Insurance / legal / accounting | ~₱30-50k/yr fixed                            | Necessary; budget annually           |

Anti-patterns: hire too early, sign annual contracts, scale infra "for growth" before growth materializes.

---

## Phase rollout (when each lever flips)

```
Phase A          ↪ ₱0 revenue · pure cost
Phase B          ↪ ₱0 revenue · cost ~₱500/mo · friends-of-founder owners
Phase C launch   ↪ FIRST REVENUE · 10% commission on Stripe-mode bookings (new owners only; Phase B owners stay free)
Phase C steady   ↪ ~₱40-100k/mo revenue · breakeven approaches
Phase D launch   ↪ Pro + Business tiers · subscription revenue + reduced commission for paid tiers
Phase D steady   ↪ ~₱200-500k/mo revenue · founder-livable
Phase E          ↪ Adjacent revenue (insurance, eSIM, transfers) · 10-30% diversification
Phase F          ↪ Enterprise (white-label, B2B API) · maybe acquisitions
```

---

## The really honest part

**Most marketplaces never reach Phase D.** They die in B-C transition because:

- Free owners feel betrayed by paid tier introduction
- Or the platform never generated enough value to justify charging
- Or the founder runs out of runway before commission revenue covers basics
- Or competitors enter with better economics

**The single biggest defense:** don't take the trust gift of Phase B for granted. Every Phase C feature, every Phase D upgrade, every Phase E adjacency should make Phase B owners feel like they got the better deal by joining early.

The grandfathering promise is **the platform's most important asset.** Honor it religiously. Refer to it in onboarding. Quote it in disputes. Brag about it publicly.

---

## When this doc changes

- New revenue lever proposed → add to roadmap with phase + rationale
- Pricing changed → migration plan + grandfather rule
- Adjacent product evaluated → cost/benefit + decision in this doc
- Owner sentiment shifts (e.g., complaints about new fee) → revisit immediately
