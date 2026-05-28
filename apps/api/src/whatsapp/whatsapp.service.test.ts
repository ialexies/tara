import { describe, it, expect } from 'vitest';

/**
 * Unit tests for WhatsApp phone normalisation.
 */

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.length === 10) return `+63${digits}`;
  if (raw.startsWith('+')) return raw.replace(/\s/g, '');
  return null;
}

describe('normalizePhone', () => {
  it('handles 09XX format (Philippine mobile)', () => {
    expect(normalizePhone('09171234567')).toBe('+639171234567');
  });

  it('handles international format without +', () => {
    expect(normalizePhone('639171234567')).toBe('+639171234567');
  });

  it('handles +63 format with spaces', () => {
    expect(normalizePhone('+63 917 123 4567')).toBe('+639171234567');
  });

  it('handles 10-digit format without country code', () => {
    expect(normalizePhone('9171234567')).toBe('+639171234567');
  });

  it('returns null for invalid number', () => {
    expect(normalizePhone('1234')).toBeNull();
    expect(normalizePhone('not-a-number')).toBeNull();
  });

  it('passes through non-PH numbers with +', () => {
    expect(normalizePhone('+14155238886')).toBe('+14155238886');
  });
});
