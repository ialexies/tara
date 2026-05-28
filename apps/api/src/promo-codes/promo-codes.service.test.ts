import { describe, it, expect } from 'vitest';

// ─── Discount calculation logic (mirrors promo-codes.service) ─────────────────

function applyDiscount(
  totalMinor: number,
  discountType: 'percent' | 'flat',
  discountValue: number,
): { discountMinor: number; finalMinor: number } {
  const discountMinor =
    discountType === 'percent' ? Math.round((totalMinor * discountValue) / 100) : discountValue;
  const finalMinor = Math.max(0, totalMinor - discountMinor);
  return { discountMinor, finalMinor };
}

describe('promo code — percent discount', () => {
  it('applies 20% off correctly', () => {
    const { discountMinor, finalMinor } = applyDiscount(100_000, 'percent', 20);
    expect(discountMinor).toBe(20_000);
    expect(finalMinor).toBe(80_000);
  });

  it('applies 100% off (free stay)', () => {
    const { discountMinor, finalMinor } = applyDiscount(100_000, 'percent', 100);
    expect(discountMinor).toBe(100_000);
    expect(finalMinor).toBe(0);
  });

  it('rounds fractional centavo amounts', () => {
    // 10% of 99,999 = 9999.9 → rounds to 10000
    const { discountMinor } = applyDiscount(99_999, 'percent', 10);
    expect(discountMinor).toBe(10_000);
  });

  it('1% discount on small amount', () => {
    const { discountMinor, finalMinor } = applyDiscount(50_000, 'percent', 1);
    expect(discountMinor).toBe(500);
    expect(finalMinor).toBe(49_500);
  });
});

describe('promo code — flat discount', () => {
  it('subtracts flat amount', () => {
    const { discountMinor, finalMinor } = applyDiscount(100_000, 'flat', 20_000);
    expect(discountMinor).toBe(20_000);
    expect(finalMinor).toBe(80_000);
  });

  it('clamps final to 0 when flat discount exceeds total', () => {
    const { discountMinor, finalMinor } = applyDiscount(10_000, 'flat', 50_000);
    expect(discountMinor).toBe(50_000);
    expect(finalMinor).toBe(0);
  });

  it('exact flat discount equals total results in 0', () => {
    const { discountMinor, finalMinor } = applyDiscount(30_000, 'flat', 30_000);
    expect(discountMinor).toBe(30_000);
    expect(finalMinor).toBe(0);
  });
});

// ─── Code format validation ───────────────────────────────────────────────────

function isValidPromoCode(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/.test(code);
}

describe('promo code format', () => {
  it('accepts uppercase alphanumeric codes', () => {
    expect(isValidPromoCode('SUMMER20')).toBe(true);
    expect(isValidPromoCode('TARA2026')).toBe(true);
    expect(isValidPromoCode('ABC')).toBe(true);
  });

  it('rejects lowercase codes', () => {
    expect(isValidPromoCode('summer20')).toBe(false);
  });

  it('rejects codes shorter than 3 chars', () => {
    expect(isValidPromoCode('AB')).toBe(false);
  });

  it('rejects codes with spaces or special chars', () => {
    expect(isValidPromoCode('PROMO CODE')).toBe(false);
    expect(isValidPromoCode('PROMO-CODE')).toBe(false);
  });

  it('rejects codes longer than 20 chars', () => {
    expect(isValidPromoCode('A'.repeat(21))).toBe(false);
  });
});

// ─── Validity window check ────────────────────────────────────────────────────

function isPromoValid(validFrom: string | null, validTo: string | null, now: string): boolean {
  if (validFrom && now < validFrom) return false;
  if (validTo && now > validTo) return false;
  return true;
}

describe('promo code validity window', () => {
  it('valid with no date constraints', () => {
    expect(isPromoValid(null, null, '2026-06-01')).toBe(true);
  });

  it('valid when within window', () => {
    expect(isPromoValid('2026-06-01', '2026-12-31', '2026-07-04')).toBe(true);
  });

  it('invalid before validFrom', () => {
    expect(isPromoValid('2026-07-01', null, '2026-06-01')).toBe(false);
  });

  it('invalid after validTo', () => {
    expect(isPromoValid(null, '2026-06-30', '2026-07-01')).toBe(false);
  });

  it('valid on exact boundary dates', () => {
    expect(isPromoValid('2026-06-01', '2026-06-30', '2026-06-01')).toBe(true);
    expect(isPromoValid('2026-06-01', '2026-06-30', '2026-06-30')).toBe(true);
  });
});
