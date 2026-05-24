# 07 — Money

How Tara represents, stores, displays, and converts money. **Get this wrong once and you owe people money you can't recover.** Or worse, you charge them money you can't refund.

> Read [`glossary.md`](glossary.md) first. Currency terms are defined there.

The fundamental rule: **money is integers in minor units. Always. Forever.** Anything else is wrong.

---

## Rule 1: Never use floats for money

```ts
// ❌ WRONG. Every floating-point math operation can lose precision.
const total = 0.1 + 0.2; // 0.30000000000000004

// ❌ WRONG. JavaScript's Number can't represent all decimal values exactly.
const amount = 1500.5; // Sometimes 1500.499999...

// ✅ RIGHT. Store as integer in minor units (centavos for PHP, cents for USD).
const total: number = 150050; // ₱1,500.50
```

All money in Tara is stored as **`int` (Postgres `integer` or `bigint`)** representing the amount in the currency's **minor unit**:

- PHP: centavos (1 PHP = 100 centavos) → `₱15.00` is `1500`
- USD: cents → `$15.00` is `1500`
- IDR: rupiah is technically already minor unit (no subdivision in practice) → `Rp 15,000` is `15000`
- JPY: yen has no fractional unit → `¥1500` is `1500` (treat as already minor)

A `MoneyAmount` value object normalizes this:

```ts
// packages/money/src/money.ts
export class MoneyAmount {
  constructor(
    public readonly minor: number,    // integer minor units
    public readonly currency: Currency // ISO 4217 code
  ) {
    if (!Number.isInteger(minor)) throw new Error('money must be integer minor units');
    if (minor < 0) throw new Error('money cannot be negative');
  }

  add(other: MoneyAmount): MoneyAmount { ... }
  subtract(other: MoneyAmount): MoneyAmount { ... }
  multiply(scalar: number): MoneyAmount { /* careful rounding */ }
  toMajor(): string { /* returns "15.00" for display */ }
}
```

**Forbidden anywhere in the codebase:** raw `number` representing money in major units. Lint rule (Phase C) detects and rejects.

---

## Rule 2: Currency is part of the type

A `number` like `1500` is meaningless without a currency. **An amount without a currency is a bug.**

```ts
// ❌ WRONG
function calculateTotal(base: number, fee: number): number {
  return base + fee; // What if base is USD and fee is PHP?
}

// ✅ RIGHT
function calculateTotal(base: MoneyAmount, fee: MoneyAmount): MoneyAmount {
  if (base.currency !== fee.currency) throw new CurrencyMismatchError();
  return base.add(fee);
}
```

Every monetary column in the DB is paired with a `currency` column. Joins/aggregations across rows MUST verify currency match or convert explicitly.

```sql
booking {
  total_minor int NOT NULL,
  currency    text NOT NULL,  -- ISO 4217, ALWAYS present alongside amount
  ...
}
```

---

## Rule 3: Settlement currency vs. display currency

**Settlement currency** = what the booking is denominated in. The currency the owner gets paid in.

**Display currency** = what the guest sees in their browser. Computed live via FX.

For Tara Phase A-B (PH only):

- Settlement = PHP (all owners are PH-based)
- Display = PHP by default; USD optional toggle

For Phase D (international):

- Settlement = property's local currency
- Display = guest's preference (cookie + browser locale)

```ts
type Booking = {
  total_minor: number;
  currency: Currency; // settlement currency — what owner gets
  display_total_minor?: number; // what guest saw (only differs if FX shown)
  display_currency?: Currency;
  fx_rate?: number; // rate used: 1 SETTLEMENT = X DISPLAY at booking time
  fx_locked_at?: Date; // when we fetched the rate
};
```

**The rate is LOCKED AT BOOKING TIME.** If the guest sees `~$28 (₱1,500)` and books, they pay ₱1,500 (settlement). The FX shown was indicative, not contractual. We display this clearly in the UI.

---

## Rule 4: FX (foreign exchange) — keep it boring

For Phase A-B, FX matters only for guests who want to see USD prices on PHP-denominated bookings.

**FX source:** Cloudflare's free FX API or `exchangerate.host` (free, no key). Updated daily, cached in Redis.

```ts
// Pseudo-code for the FX module
async function convert(amount: MoneyAmount, to: Currency): Promise<MoneyAmount> {
  if (amount.currency === to) return amount;
  const rate = await fxRates.get(`${amount.currency}->${to}`); // cached 24h
  const convertedMinor = Math.round(amount.minor * rate);
  return new MoneyAmount(convertedMinor, to);
}
```

**Rounding:** `Math.round` (round half up). Per-currency rounding rules (some currencies round to 5 cents, etc.) ignored until Phase D.

**Refresh cadence:** daily at 02:00 PHT. Cached in Redis with 25h TTL (so if refresh fails, we use yesterday's rate, not nothing).

**Failure mode:** if FX rate unavailable, **don't show display currency.** Show only settlement. Never display a wrong number.

### Why not use real-time FX APIs?

- Adds external call latency to page load
- Most are paid for production use
- Daily updates are accurate enough for "indicative display only"
- Spot rates would create confusing UX (price changes per refresh)

### Multi-currency settlement (Phase D problem, not now)

When we expand to Indonesia/Thailand:

- Property declares its `settlement_currency` (PHP, IDR, THB)
- Owner's Stripe Connected Account configured for that currency
- Stripe handles cross-currency payouts (with their FX margin baked into the rate they give)
- We don't manage FX risk; Stripe does

---

## Rule 5: Tax (PH-specific for Phase A-B)

PH tourism accommodation has several taxes that owners must collect:

| Tax                   | Rate                                                            | Who collects              | When applies                  |
| --------------------- | --------------------------------------------------------------- | ------------------------- | ----------------------------- |
| **VAT**               | 12%                                                             | Owner (if VAT-registered) | Always for VAT-reg businesses |
| **Local Tourism Tax** | Varies by LGU (e.g., ₱20-50/night/guest in some Zambales towns) | Owner                     | Per LGU regulations           |
| **Service charge**    | 0-10% (optional)                                                | Owner                     | Discretionary                 |

**Tara's model:**

- Each property declares: `is_vat_registered: bool`, `local_taxes: array of {name, type, value}`
- Pricing breakdown shows taxes line-by-line at quote time
- All taxes flow to the owner (Tara doesn't collect them)
- Tara's commission is on the **base nightly rate**, NOT on taxes

```
Guest pays:
  Base rate × nights    = ₱1,500 × 3 = ₱4,500
  VAT 12%               = ₱540
  Local tourism tax     = ₱60 (₱20/night)
  ───────────────────────────────
  Total                 = ₱5,100

Tara commission (10% on base): ₱450
Owner receives:                ₱5,100 - ₱450 = ₱4,650
  (which includes ₱540 VAT + ₱60 LGU tax that owner is responsible for)
```

**Critical:** the breakdown shown to the guest at checkout MUST equal the amount charged. No surprise fees at checkout. (Booking.com gets bad press for this; we won't.)

### Tax stored on the booking

```sql
booking {
  base_total_minor      int,   -- nightly rates × nights
  vat_minor             int,   -- computed at booking time, locked
  local_tax_minor       int,   -- computed at booking time, locked
  service_charge_minor  int,   -- optional
  total_minor           int,   -- sum of above
  currency              text,
  ...
}
```

**Locked at booking time** — if owner changes their VAT registration status later, this booking's tax doesn't change.

---

## Rule 6: Rounding — define once, apply everywhere

Every monetary computation has a rounding moment. Define it once.

```ts
// packages/money/src/rounding.ts

/** Round to nearest minor unit (half up). Tara default. */
export function round(value: number): number {
  return Math.round(value);
}

/** Apply a percentage and round. Used for commissions, taxes, discounts. */
export function applyPercentage(amount: MoneyAmount, pct: number): MoneyAmount {
  const result = amount.minor * (pct / 100);
  return new MoneyAmount(Math.round(result), amount.currency);
}
```

**Compound rounding error (a real bug):**

```ts
// ❌ WRONG: round at each step → can drift
const nightly = round(base * 1.12); // VAT applied per night
const total = nightly * nights; // multiplies the rounding error

// ✅ RIGHT: round once, at the end
const subtotal = base * nights;
const total = round(subtotal * 1.12);
```

Standard tests cover this with property-based tests (`fast-check`).

### Banker's rounding (round half to even) — when?

Some financial systems use banker's rounding to reduce bias. For Tara's scale and use case, standard half-up is correct and matches what people expect when they see "₱15.005 → ₱15.01". Stick with `Math.round`.

---

## Rule 7: Commission math (this is the money flow)

Tara's commission is a percentage of the **base booking total** (nightly rates × nights), NOT the total-with-taxes.

```ts
// packages/money/src/commission.ts
export function computeCommission(
  baseTotal: MoneyAmount,
  ratePercent: number, // 10 for 10%
): MoneyAmount {
  return applyPercentage(baseTotal, ratePercent);
}
```

For the Stripe flow:

- Guest pays `total_minor` → lands in Tara's platform balance
- Tara creates transfer of `total_minor - commission_minor` to owner's connected account
- Tara retains `commission_minor` as revenue

**Stripe fees** (their cut: ~2.9% + ₱15 per transaction): paid out of Tara's commission. NOT additional fee to guest, NOT deducted from owner. Tara absorbs.

```
Guest pays:           ₱5,100 (incl tax)
Stripe fee:           ₱163 (2.9% + ₱15)
Tara gross commission:₱450 (10% of base ₱4,500)
Tara net commission:  ₱450 - ₱163 = ₱287
Owner receives:       ₱5,100 - ₱450 = ₱4,650
```

This is the model that lets us undercut Hostelworld (15%) while remaining profitable per booking.

### What if Stripe fees > our commission?

Possible on tiny bookings. Example: ₱500 booking × 10% = ₱50 commission. Stripe takes ₱29 from our ₱50.

For now: accept this. Phase D, add minimum booking total or per-transaction floor fee.

---

## Rule 8: Refunds — partial is the norm

Per [`04-booking-lifecycle.md`](04-booking-lifecycle.md), cancellation policies often produce partial refunds.

```ts
// Compute refund amount (Money math, in cancellation.ts)
export function computeRefund(
  bookingTotal: MoneyAmount,
  policy: CancellationPolicy,
  cancelledAt: Date,
  checkIn: Date,
): MoneyAmount {
  const hoursUntilCheckIn = differenceInHours(checkIn, cancelledAt);
  const percentRefund = refundPercent(policy, hoursUntilCheckIn);
  return applyPercentage(bookingTotal, percentRefund);
}
```

Edge cases:

- **Refund amount rounding**: half a centavo of refund? Round up. Always favor the guest.
- **Refund exceeds original payment**: forbidden. Validate at the call site.
- **Tax portion of refund**: refunded proportionally. We don't refund VAT separately; the whole percentage applies uniformly.

### Stripe partial refunds

```ts
await stripe.refunds.create({
  payment_intent: 'pi_xxx',
  amount: refundAmount.minor,
  metadata: { booking_id: '...', reason: 'guest_cancellation_moderate_policy' },
});
```

Always include metadata for our reconciliation.

---

## Rule 9: Money in logs and analytics

**NEVER log raw money values in plaintext.** Pino redact config handles this:

```ts
// packages/logger/src/index.ts
export const logger = pino({
  redact: {
    paths: [
      'total_minor',
      'rate_minor',
      'refund_minor',
      'commission_minor',
      'card.number',
      '*.card',
    ],
    censor: '[REDACTED]',
  },
});
```

For analytics (PostHog events), money is OK to send aggregated (e.g., booking_value bucketed into ranges: `<500`, `500-1000`, etc.), not as raw amounts per user.

---

## Rule 10: Display formatting

Use `Intl.NumberFormat` with the user's locale.

```ts
// packages/money/src/format.ts
export function formatMoney(amount: MoneyAmount, locale: string = 'en-PH'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount.minor / 100);
}
```

Outputs:

- `formatMoney(new MoneyAmount(150050, 'PHP'), 'en-PH')` → `"₱1,500.50"`
- `formatMoney(new MoneyAmount(150050, 'USD'), 'en-US')` → `"$1,500.50"`

This is **the only place** in the codebase that divides money by 100. Centralizes the unit conversion at the display boundary.

---

## DB schema for money

```sql
-- Generic columns used wherever money appears
total_minor      bigint NOT NULL,   -- bigint for safety; ₱90,000,000+ booking possible
currency         text   NOT NULL,   -- ISO 4217 code

-- Constraint: amounts must be non-negative
CHECK (total_minor >= 0)

-- Optional: enforce known currency codes
CHECK (currency IN ('PHP', 'USD', 'EUR', 'IDR', 'THB', 'VND', 'SGD', 'JPY'))
```

`bigint` over `int`: a single int is `~2.1 billion`. Enough for ₱21 million. Fine for most bookings, but a 100-bed property with multi-month long-stays could approach it. `bigint` (9 quintillion max) is safer with zero practical downside.

---

## Testing — money is where property-based tests shine

Use `fast-check` aggressively here.

```ts
// packages/money/__tests__/money.test.ts

describe('MoneyAmount.add', () => {
  it('is associative', () => {
    fc.assert(
      fc.property(money(), money(), money(), (a, b, c) => {
        return a
          .add(b)
          .add(c)
          .equals(a.add(b.add(c)));
      }),
    );
  });

  it('is commutative', () => {
    fc.assert(
      fc.property(money(), money(), (a, b) => {
        return a.add(b).equals(b.add(a));
      }),
    );
  });

  it('throws on currency mismatch', () => {
    fc.assert(
      fc.property(money('PHP'), money('USD'), (a, b) => {
        expect(() => a.add(b)).toThrow(CurrencyMismatchError);
      }),
    );
  });
});

describe('applyPercentage', () => {
  it('always returns non-negative integer minor units', () => {
    fc.assert(
      fc.property(money(), fc.float({ min: 0, max: 100 }), (a, pct) => {
        const result = applyPercentage(a, pct);
        return result.minor >= 0 && Number.isInteger(result.minor);
      }),
    );
  });

  it('full percentage returns same amount', () => {
    fc.assert(fc.property(money(), (a) => applyPercentage(a, 100).equals(a)));
  });

  it('zero percentage returns zero', () => {
    fc.assert(fc.property(money(), (a) => applyPercentage(a, 0).minor === 0));
  });
});

describe('computeRefund', () => {
  it('refund <= booking total, always', () => {
    fc.assert(
      fc.property(
        money(),
        fc.constantFrom('flexible', 'moderate', 'strict'),
        fc.date(),
        fc.date(),
        (total, policy, cancelAt, checkIn) => {
          const refund = computeRefund(total, policy, cancelAt, checkIn);
          return refund.minor <= total.minor;
        },
      ),
    );
  });

  it('strict policy returns 0 if within 7 days of check-in', () => {
    fc.assert(
      fc.property(money(), (total) => {
        const checkIn = addDays(new Date(), 3); // 3 days from now
        const refund = computeRefund(total, 'strict', new Date(), checkIn);
        return refund.minor === 0;
      }),
    );
  });
});
```

Unit tests catch the obvious cases. Property tests catch the cases you didn't think of. Both required.

---

## The MoneyAmount value object — full implementation sketch

```ts
// packages/money/src/money.ts

export type Currency = 'PHP' | 'USD' | 'EUR' | 'IDR' | 'THB' | 'VND' | 'SGD' | 'JPY';

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`cannot operate on different currencies: ${a} and ${b}`);
  }
}

export class MoneyAmount {
  constructor(
    public readonly minor: number,
    public readonly currency: Currency,
  ) {
    if (!Number.isInteger(minor)) {
      throw new Error(`money must be integer minor units, got ${minor}`);
    }
    if (minor < 0) {
      throw new Error(`money cannot be negative, got ${minor}`);
    }
  }

  add(other: MoneyAmount): MoneyAmount {
    this.assertSameCurrency(other);
    return new MoneyAmount(this.minor + other.minor, this.currency);
  }

  subtract(other: MoneyAmount): MoneyAmount {
    this.assertSameCurrency(other);
    if (this.minor < other.minor) {
      throw new Error('subtraction would result in negative money');
    }
    return new MoneyAmount(this.minor - other.minor, this.currency);
  }

  multiply(scalar: number): MoneyAmount {
    return new MoneyAmount(Math.round(this.minor * scalar), this.currency);
  }

  equals(other: MoneyAmount): boolean {
    return this.minor === other.minor && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.minor === 0;
  }

  toMajor(): string {
    return (this.minor / 100).toFixed(2);
  }

  toJSON() {
    return { minor: this.minor, currency: this.currency };
  }

  static zero(currency: Currency): MoneyAmount {
    return new MoneyAmount(0, currency);
  }

  static fromMajor(major: number | string, currency: Currency): MoneyAmount {
    const num = typeof major === 'string' ? parseFloat(major) : major;
    return new MoneyAmount(Math.round(num * 100), currency);
  }

  private assertSameCurrency(other: MoneyAmount): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
```

This class lives in `packages/money/` and is the **only way** money flows through the system. No raw numbers.

---

## What we deliberately defer

| Feature                                            | Phase | Why                                                            |
| -------------------------------------------------- | ----- | -------------------------------------------------------------- |
| Multi-currency owners (settlement currency != PHP) | D     | Phase A-B is PH-only                                           |
| Real-time FX with intraday updates                 | D+    | Daily is enough; cuts cost + complexity                        |
| Tax invoicing (PH BIR-compliant receipts)          | C     | Required before charging real money; via accountant            |
| Currency-specific rounding (round to 5 cents)      | D     | Not needed for PHP/USD                                         |
| Withholding tax calculation                        | C     | Tara may need to withhold on owner payouts; accountant defines |
| Tip / gratuity flow                                | E     | Not common in PH hostel context                                |
| Multi-currency single booking                      | never | Always one settlement currency per booking                     |

---

## When this doc changes

- New currency added → update `Currency` type + ISO 4217 check constraint
- New rounding rule → update `packages/money/src/rounding.ts` + tests
- New tax type → schema migration + booking breakdown computation
- ADR if changing the integer-minor-units rule (don't — there's no good reason)
