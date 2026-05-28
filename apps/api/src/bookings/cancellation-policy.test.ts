import { describe, it, expect } from 'vitest';

/**
 * Unit tests for cancellation policy and booking expiry logic.
 */

function calcRefundPercent(
  checkIn: string,
  freeCancelDays: number,
  partialRefundPercent: number,
  now = new Date(),
): number {
  const daysUntilCheckIn = Math.ceil(
    (new Date(checkIn).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  // freeCancelDays=0 means no free period — partial/no refund always applies
  return freeCancelDays > 0 && daysUntilCheckIn >= freeCancelDays ? 100 : partialRefundPercent;
}

describe('calcRefundPercent', () => {
  const fiveDaysOut = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const oneDayOut = new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10);

  it('gives 100% refund when within free cancel window', () => {
    expect(calcRefundPercent(fiveDaysOut, 3, 50)).toBe(100);
  });

  it('gives partial refund after free cancel period', () => {
    expect(calcRefundPercent(oneDayOut, 3, 50)).toBe(50);
  });

  it('gives 0% when non-refundable', () => {
    expect(calcRefundPercent(oneDayOut, 3, 0)).toBe(0);
  });

  it('handles 0 free cancel days (always paid)', () => {
    expect(calcRefundPercent(fiveDaysOut, 0, 50)).toBe(50);
  });
});

describe('booking auto-expiry', () => {
  it('24h cutoff is 86400000ms', () => {
    const EXPIRY_MS = 24 * 60 * 60 * 1000;
    expect(EXPIRY_MS).toBe(86_400_000);
  });

  it('booking created 25h ago should be past expiry', () => {
    const EXPIRY_MS = 24 * 60 * 60 * 1000;
    const bookingCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const cutoff = new Date(Date.now() - EXPIRY_MS);
    expect(bookingCreatedAt < cutoff).toBe(true);
  });

  it('booking created 23h ago should not be expired', () => {
    const EXPIRY_MS = 24 * 60 * 60 * 1000;
    const bookingCreatedAt = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const cutoff = new Date(Date.now() - EXPIRY_MS);
    expect(bookingCreatedAt < cutoff).toBe(false);
  });
});

describe('minimum stay enforcement', () => {
  function nightsBetween(checkIn: string, checkOut: string): string[] {
    const nights: string[] = [];
    const cur = new Date(checkIn);
    const end = new Date(checkOut);
    while (cur < end) {
      nights.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return nights;
  }

  it('1 night stay satisfies minNights=1', () => {
    const nights = nightsBetween('2026-06-01', '2026-06-02');
    expect(nights.length).toBeGreaterThanOrEqual(1);
  });

  it('1 night stay fails minNights=2', () => {
    const nights = nightsBetween('2026-06-01', '2026-06-02');
    expect(nights.length < 2).toBe(true);
  });

  it('weekend stay of 2 nights satisfies minNights=2', () => {
    const nights = nightsBetween('2026-06-06', '2026-06-08');
    expect(nights.length).toBeGreaterThanOrEqual(2);
  });
});
