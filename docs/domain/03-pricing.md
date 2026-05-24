# 03 — Pricing

How Tara computes the price of a booking, from the moment the guest selects dates to the final total at checkout.

> Read [`07-money.md`](07-money.md) (currency, integer minor units, tax model), [`08-temporal.md`](08-temporal.md) (night math), [`01-inventory.md`](01-inventory.md) (room/unit model) first.

The pricing engine is the **second most opinionated subsystem in Tara** (after the booking lifecycle). Owners express what they want via rate plans + rules; the engine compiles that into a per-night price for any (unit, date) combination.

---

## The model — three layers

```
Property
   │
   ├──< Rate Plan                  (named strategy: "Standard Rate", "Non-refundable -10%")
   │      │
   │      └──< Pricing Rule        (modifier: "+30% weekends", "-20% for 7+ nights")
   │
   └──< Unit base prices            (optional per-unit overrides)
```

### Rate Plan

A named pricing offering attached to a property. The guest sees rate plans as separate "deals" to choose from.

```sql
rate_plans {
  id              uuid PK,
  property_id     uuid FK,
  tenant_id       text,
  name            text,           -- "Standard Rate", "Early Bird -15%"
  slug            text,
  is_default      bool,           -- exactly one per property must be true
  cancellation_policy enum,       -- 'flexible' | 'moderate' | 'strict'
  is_refundable   bool,
  meal_plan       enum,           -- 'none' | 'breakfast_included' | 'half_board' | 'full_board'
  position        int,
  is_active       bool DEFAULT true,
  created_at, updated_at, deleted_at
}
```

**Default rate plan:** every property has exactly one. The guest sees it by default; alternative rate plans appear as upsells/options.

### Pricing Rule

A modifier that applies under specific conditions. Modifies the base nightly rate up or down.

```sql
pricing_rules {
  id              uuid PK,
  rate_plan_id    uuid FK,
  tenant_id       text,
  name            text,                    -- human label: "Holy Week +50%"
  rule_type       enum,                    -- see below
  config          jsonb,                   -- type-specific config
  modifier_type   enum,                    -- 'absolute' | 'percent'
  modifier_value  int,                     -- minor units if absolute, basis points if percent
  priority        int,                     -- application order
  starts_at       date,                    -- effective window
  ends_at         date,
  is_active       bool,
  created_at, updated_at, deleted_at
}
```

### Rule types (Phase B set)

| Rule type         | Config                                           | Example                                   |
| ----------------- | ------------------------------------------------ | ----------------------------------------- |
| `seasonal`        | `{ start_month, start_day, end_month, end_day }` | "+30% from Dec 15 to Jan 5 every year"    |
| `day_of_week`     | `{ days: [5, 6] }` (Fri, Sat)                    | "+25% on weekends"                        |
| `length_of_stay`  | `{ min_nights, max_nights? }`                    | "-20% for 7+ nights"                      |
| `advance_booking` | `{ min_days_ahead }`                             | "-15% if booked 30+ days in advance"      |
| `last_minute`     | `{ max_hours_ahead }`                            | "-10% within 48 hours of check-in"        |
| `occupancy`       | `{ min_extra }`                                  | "+₱500/night per extra person above base" |
| `specific_dates`  | `{ dates: ['2026-12-31'] }`                      | "+50% on New Year's Eve" (one-off)        |

Phase D+ adds: `competitor_price`, `dynamic_demand`, `loyalty_tier` etc. Out of scope for MVP.

---

## How a price gets computed

For a quote of "Unit X, nights [N1, N2, ..., Nk]":

```
for each night N:
  base_rate = property.base_nightly_rate (or unit override)
  applicable_rules = pricing_rules where:
      .rate_plan_id = chosen_rate_plan
      .is_active = true
      .effective(N) = true     # date in [starts_at, ends_at]
      .matches_context(N, booking_dates) = true
  sort applicable_rules by priority ASC
  rate = base_rate
  for each rule:
      rate = apply_modifier(rate, rule)
  nightly[N] = rate

subtotal_minor = sum(nightly[N] for N in nights)

# Then add taxes (per Money doc)
vat_minor = compute_vat(subtotal_minor, property.is_vat_registered)
local_tax_minor = compute_local_tax(subtotal_minor, nights, property.local_taxes)
service_charge_minor = compute_service_charge(subtotal_minor, property.service_charge_pct)

total_minor = subtotal_minor + vat_minor + local_tax_minor + service_charge_minor
```

**Rules apply per night, not per booking.** A booking of 5 nights where 2 fall on weekends has weekend uplift only on those 2 nights.

**Order matters.** Stacking `+30%` then `-20%` ≠ `-20%` then `+30%`. We define a canonical order: `priority ASC`, then rule type alphabetical. Predictable for owners, testable for us.

---

## Worked example (Pundaquit surf hostel, Phase B)

Property:

- Base rate: ₱600/night (dorm bed)
- VAT registered: no (small business)
- Local tourism tax: ₱20/night/guest

Rate plan: "Standard Rate" (default)

- Cancellation: moderate
- Refundable: yes

Pricing rules on Standard Rate:

1. `day_of_week`: Sat+Sun → +25% (priority 10)
2. `length_of_stay`: 7+ nights → −15% (priority 20)
3. `seasonal`: Nov 1 - Mar 31 → +20% (peak surf season, priority 30)

Guest books: Nov 14 (Sat) → Nov 17 (Tue), 3 nights.

Per-night computation:

| Night        | Base | weekend?     | seasonal?    | LOS? | After rules |
| ------------ | ---- | ------------ | ------------ | ---- | ----------- |
| Nov 14 (Sat) | ₱600 | ×1.25 = ₱750 | ×1.20 = ₱900 | —    | **₱900**    |
| Nov 15 (Sun) | ₱600 | ×1.25 = ₱750 | ×1.20 = ₱900 | —    | **₱900**    |
| Nov 16 (Mon) | ₱600 | —            | ×1.20 = ₱720 | —    | **₱720**    |

Subtotal: ₱900 + ₱900 + ₱720 = **₱2,520**

Taxes:

- VAT: ₱0 (not registered)
- Local tax: ₱20 × 3 nights = ₱60
- Service charge: ₱0

**Total: ₱2,580**

In minor units: `subtotal_minor=252000, local_tax_minor=6000, total_minor=258000`, currency `PHP`.

Tara commission (Phase C onward): 10% × subtotal = ₱252 → owner gets ₱2,328 after Tara fee + keeps the ₱60 LGU tax to remit.

---

## The pricing engine (pure function)

```ts
// packages/pricing/src/engine.ts

export type Quote = {
  unit_id: string;
  rate_plan_id: string;
  nights: Array<{
    date: CalendarDate;
    base_minor: number;
    final_minor: number;
    rule_breakdown: Array<{
      rule_id: string;
      rule_name: string;
      before_minor: number;
      after_minor: number;
    }>;
  }>;
  subtotal_minor: number;
  vat_minor: number;
  local_tax_minor: number;
  service_charge_minor: number;
  total_minor: number;
  currency: Currency;
  computed_at: Date;
  quote_token: string; // signed token for tamper-evidence
  expires_at: Date; // 5 minutes from now
};

export function computeQuote({
  property,
  unit,
  ratePlan,
  rules,
  nights,
  bookingDate,
  occupancy,
}: ComputeQuoteInput): Quote {
  // 1. Per-night computation
  const nightlyBreakdown = nights.map((date) => {
    const base = unit.base_nightly_rate_minor ?? property.base_nightly_rate_minor;
    let rate = base;
    const ruleBreakdown: RuleApplication[] = [];

    const applicable = rules
      .filter((r) => isRuleApplicable(r, { date, bookingDate, nights, occupancy }))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicable) {
      const before = rate;
      rate = applyModifier(rate, rule);
      ruleBreakdown.push({
        rule_id: rule.id,
        rule_name: rule.name,
        before_minor: before,
        after_minor: rate,
      });
    }

    return { date, base_minor: base, final_minor: rate, rule_breakdown: ruleBreakdown };
  });

  // 2. Subtotal
  const subtotal_minor = nightlyBreakdown.reduce((sum, n) => sum + n.final_minor, 0);

  // 3. Taxes
  const vat_minor = property.is_vat_registered
    ? applyPercentage(new MoneyAmount(subtotal_minor, property.currency), 12).minor
    : 0;
  const local_tax_minor = computeLocalTaxes(property.local_taxes, nights.length, occupancy);
  const service_charge_minor =
    property.service_charge_pct > 0
      ? applyPercentage(
          new MoneyAmount(subtotal_minor, property.currency),
          property.service_charge_pct,
        ).minor
      : 0;

  // 4. Total
  const total_minor = subtotal_minor + vat_minor + local_tax_minor + service_charge_minor;

  // 5. Signed quote token (prevents tampering at booking time)
  const quote_token = signQuote({ ...nightlyBreakdown, subtotal_minor, total_minor });

  return {
    unit_id: unit.id,
    rate_plan_id: ratePlan.id,
    nights: nightlyBreakdown,
    subtotal_minor,
    vat_minor,
    local_tax_minor,
    service_charge_minor,
    total_minor,
    currency: property.currency,
    computed_at: new Date(),
    quote_token,
    expires_at: addMinutes(new Date(), 5),
  };
}
```

**Pure function** — same inputs always produce same outputs. No DB calls inside. The caller fetches data, the engine computes. Tests are trivial.

---

## Rule applicability — the matchers

Each rule type has its own matcher:

```ts
function isRuleApplicable(rule: PricingRule, ctx: RuleContext): boolean {
  // Effective date window
  if (rule.starts_at && ctx.date < rule.starts_at) return false;
  if (rule.ends_at && ctx.date > rule.ends_at) return false;

  switch (rule.rule_type) {
    case 'seasonal': {
      const cfg = rule.config as SeasonalConfig;
      const monthDay = `${ctx.date.month}-${ctx.date.day}`;
      return monthDayInRange(monthDay, cfg);
    }
    case 'day_of_week': {
      const cfg = rule.config as DayOfWeekConfig;
      return cfg.days.includes(ctx.date.dayOfWeek);
    }
    case 'length_of_stay': {
      const cfg = rule.config as LosConfig;
      if (ctx.nights.length < cfg.min_nights) return false;
      if (cfg.max_nights && ctx.nights.length > cfg.max_nights) return false;
      return true;
    }
    case 'advance_booking': {
      const cfg = rule.config as AdvanceBookingConfig;
      const daysAhead = differenceInDays(ctx.nights[0], ctx.bookingDate);
      return daysAhead >= cfg.min_days_ahead;
    }
    case 'last_minute': {
      const cfg = rule.config as LastMinuteConfig;
      const hoursAhead = differenceInHours(ctx.nights[0], ctx.bookingDate);
      return hoursAhead <= cfg.max_hours_ahead;
    }
    case 'occupancy': {
      const cfg = rule.config as OccupancyConfig;
      return ctx.occupancy >= cfg.min_extra; // extra guests above base
    }
    case 'specific_dates': {
      const cfg = rule.config as SpecificDatesConfig;
      return cfg.dates.some((d) => isSameDate(d, ctx.date));
    }
  }
}
```

Each matcher is a pure function. Each gets unit-tested. Property-based tests for the date math.

---

## The modifier — absolute vs percent

```ts
function applyModifier(rate_minor: number, rule: PricingRule): number {
  if (rule.modifier_type === 'percent') {
    // modifier_value is in basis points: 1000 = 10.00%, 12500 = 125.00%
    const pct = rule.modifier_value / 100;
    return Math.round(rate_minor * (pct / 100 + 1)); // +X% or -X%
    // Wait — for a -20% rule, modifier_value = -2000? Or 2000 with rule_kind=discount?
  }
  if (rule.modifier_type === 'absolute') {
    // modifier_value is in minor units, signed
    return Math.max(0, rate_minor + rule.modifier_value);
  }
}
```

**Convention to lock down (worth your input):**

Two ways to model "−20% weekend discount":

- Option A: `modifier_type='percent'`, `modifier_value=-2000` (basis points, signed)
- Option B: `modifier_type='percent_decrease'`, `modifier_value=2000` (always positive)

Option A is cleaner code (one type, signed value). Option B is friendlier UI (owner picks "discount" vs "uplift" radio button). For Phase B internal-only admin UI, Option A wins on simplicity. Switch UX later if owner-facing.

---

## Quote tokens — tamper evidence

The price shown to the guest at quote time is signed. At booking time, the API re-verifies:

```ts
const quote = computeQuote({...});
const token = jwt.sign(
  { quote_hash: hash(quote), expires: quote.expires_at },
  SIGNING_SECRET,
  { expiresIn: '5m' }
);
// Send quote + token to client

// Later, at booking time:
const valid = jwt.verify(quote_token, SIGNING_SECRET);
if (Date.now() > valid.expires) throw new QuoteExpiredError();
const recomputed = computeQuote({...same inputs...});
if (hash(recomputed) !== valid.quote_hash) throw new QuoteMismatchError();
// Use the verified quote.total_minor for the charge.
```

This prevents a malicious client from sending a `total_minor: 1` at booking time. The price at booking is **always derived from server-side computation**, never trusted from client input.

---

## Caching

Quotes are computed thousands of times during browsing.

**Two layers of caching:**

1. **Per-request memoization** — within one HTTP request that fetches 50 properties, each property's rate plan + rules are loaded once, not 50 times.

2. **Redis quote cache** — key: `quote:<property_id>:<unit_id>:<check_in>:<check_out>:<rate_plan>:<occupancy>`. TTL 60 seconds. Invalidated immediately when a rule or rate plan changes.

   ```
   GET quote:prop123:unitA:2026-11-14:2026-11-17:standard:2
   → cached MoneyAmount + breakdown
   ```

3. **No caching at booking time.** The quote token verification recomputes from scratch. The 60-second Redis cache is for browsing only.

---

## Anti-patterns to never do

1. **Storing computed prices on the property/unit row.** Always derive on demand. Otherwise rules update creates drift.

2. **Doing pricing inside the booking transaction.** Compute the quote first (no DB writes), then the booking transaction uses the verified quote. Keeps the locking transaction short.

3. **Mutating rules in-place.** New version = new row. Track via `version` column (Phase C). Phase B: just don't edit, create new + deactivate old.

4. **Comparing money as raw numbers without currency.** All operations through `MoneyAmount`. See [07-money.md](07-money.md).

5. **Floating-point percent math.** `Math.round(rate * 1.25)` not `rate * 1.25` directly cast to int.

---

## Testing

Heavy use of fixtures + property-based tests.

```ts
// packages/pricing/__tests__/engine.test.ts

describe('pricing engine', () => {
  it('applies weekend uplift only on Sat/Sun nights', () => {
    const quote = computeQuote({
      property: pundaquitSurfHostel,
      unit: dormBed1,
      ratePlan: standardRate,
      rules: [weekendUpliftRule], // +25% Fri+Sat
      nights: ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'],
      bookingDate: new Date('2026-10-01'),
      occupancy: 1,
    });

    expect(quote.nights[0].final_minor).toBe(60000); // Fri = ₱600
    expect(quote.nights[1].final_minor).toBe(75000); // Sat = ₱750
    expect(quote.nights[2].final_minor).toBe(75000); // Sun = ₱750
    expect(quote.nights[3].final_minor).toBe(60000); // Mon = ₱600
  });

  it('stacks rules deterministically by priority', () => {
    // Owner has both weekend +25% and seasonal +20%
    // Sat in peak season: base × 1.25 × 1.20 = base × 1.50
    const quote = computeQuote({...});
    expect(quote.nights[0].final_minor).toBe(90000); // 600 × 1.5
    expect(quote.nights[0].rule_breakdown).toHaveLength(2);
  });

  it('LOS discount applies only when length threshold met', () => {
    const sixNights = computeQuote({...nights: range(6)});
    const sevenNights = computeQuote({...nights: range(7)});

    expect(sixNights.nights[0].rule_breakdown).toEqual([]); // no LOS rule applied
    expect(sevenNights.nights[0].rule_breakdown[0].rule_name).toBe('Long stay -15%');
  });

  it('quote token verification fails on tampering', () => {
    const original = computeQuote({...});
    const tampered = { ...original, total_minor: 1 };
    expect(() => verifyQuoteToken(original.quote_token, tampered)).toThrow();
  });

  // Property-based: total is always sum of nightly + taxes
  it('total = sum(nightly) + vat + local + service', () => {
    fc.assert(fc.property(...quoteInputs(), (inputs) => {
      const q = computeQuote(inputs);
      const sum = q.nights.reduce((s, n) => s + n.final_minor, 0);
      expect(q.subtotal_minor).toBe(sum);
      expect(q.total_minor).toBe(sum + q.vat_minor + q.local_tax_minor + q.service_charge_minor);
    }));
  });
});
```

Worked-example tests for the Pundaquit surf hostel scenario (above) is one of these. When owners ask "why did Tara charge X?", we paste the test that proves the math.

---

## What's deliberately deferred

| Feature                                                               | Phase | Why                                                 |
| --------------------------------------------------------------------- | ----- | --------------------------------------------------- |
| **Dynamic / demand-based pricing**                                    | D+    | Need 6+ months of data to model demand; ML required |
| **Competitor-based pricing** ("match Hostelworld's price -5%")        | D+    | Requires Hostelworld scraping or partnerships       |
| **Loyalty discounts** ("returning guest 10%")                         | D     | No guest loyalty data yet                           |
| **Promo codes**                                                       | C     | Add when running first marketing campaigns          |
| **Per-unit base price overrides**                                     | C     | Phase B: all dorm beds priced same                  |
| **Channel-specific rates** ("show different price on Booking.com")    | 3     | Comes with channel manager                          |
| **Rule versioning**                                                   | C     | Phase B: replace, not version                       |
| **Owner-facing rule builder UI with previews**                        | C     | Phase B: founder configures via admin or DB direct  |
| **Multi-currency rate plans** (one plan, multiple display currencies) | D+    | FX layer handles for Phase B                        |

---

## When this doc changes

- New rule type → add matcher + config schema + tests + UI
- Modifier convention change → migration + tests
- Tax model change → coordinate with `07-money.md`
- Performance issue → consider precomputed price calendar (last resort)
