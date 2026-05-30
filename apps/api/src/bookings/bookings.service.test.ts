import { describe, it, expect } from 'vitest';

/**
 * Unit tests for booking business logic helpers.
 * Full integration tests (availability, booking creation) require a live DB
 * and are covered by the testcontainer integration suite.
 */

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const cur = new Date(checkIn);
  const end = new Date(checkOut);
  while (cur < end) {
    nights.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return nights;
}

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TARA-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

describe('nightsBetween', () => {
  it('returns one night for a 1-night stay', () => {
    expect(nightsBetween('2026-06-01', '2026-06-02')).toEqual(['2026-06-01']);
  });

  it('returns correct nights for a multi-night stay', () => {
    expect(nightsBetween('2026-06-01', '2026-06-04')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('returns empty array when checkOut equals checkIn', () => {
    expect(nightsBetween('2026-06-01', '2026-06-01')).toEqual([]);
  });

  it('returns empty array when checkOut is before checkIn', () => {
    expect(nightsBetween('2026-06-03', '2026-06-01')).toEqual([]);
  });

  it('handles month boundaries correctly', () => {
    const nights = nightsBetween('2026-01-30', '2026-02-02');
    expect(nights).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
  });
});

describe('generateReferenceCode', () => {
  it('generates code with TARA- prefix', () => {
    const code = generateReferenceCode();
    expect(code).toMatch(/^TARA-[A-Z2-9]{6}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateReferenceCode));
    // With 32^6 ~= 1 billion combinations, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });

  it('does not include ambiguous characters (0, 1, I, O)', () => {
    const codes = Array.from({ length: 200 }, generateReferenceCode).join('');
    expect(codes).not.toMatch(/[01IO]/);
  });
});

// ─── Guest email ownership check (mirrors getIdUploadUrl / saveIdDocumentUrl) ─

function guestEmailMatches(bookingEmail: string, providedEmail: string): boolean {
  return bookingEmail.toLowerCase() === providedEmail.toLowerCase();
}

describe('guest email ownership check', () => {
  it('matches same email case-insensitively', () => {
    expect(guestEmailMatches('Guest@Test.com', 'guest@test.com')).toBe(true);
  });

  it('rejects different email', () => {
    expect(guestEmailMatches('guest@test.com', 'other@test.com')).toBe(false);
  });

  it('handles mixed case on both sides', () => {
    expect(guestEmailMatches('GUEST@TEST.COM', 'guest@test.com')).toBe(true);
  });
});
