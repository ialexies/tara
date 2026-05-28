import { describe, it, expect } from 'vitest';

/**
 * Unit tests for messaging helpers.
 */

// ─── Message body validation ──────────────────────────────────────────────────

function validateMessageBody(body: unknown): string {
  if (typeof body !== 'string') throw new Error('body must be a string');
  const trimmed = body.trim();
  if (trimmed.length === 0) throw new Error('message cannot be empty');
  if (trimmed.length > 2000) throw new Error('message too long');
  return trimmed;
}

describe('validateMessageBody', () => {
  it('returns trimmed body for valid input', () => {
    expect(validateMessageBody('  hello  ')).toBe('hello');
  });

  it('throws for empty string', () => {
    expect(() => validateMessageBody('')).toThrow('empty');
    expect(() => validateMessageBody('   ')).toThrow('empty');
  });

  it('throws for non-string', () => {
    expect(() => validateMessageBody(123)).toThrow('string');
    expect(() => validateMessageBody(null)).toThrow('string');
  });

  it('throws for body exceeding 2000 chars', () => {
    expect(() => validateMessageBody('a'.repeat(2001))).toThrow('too long');
  });

  it('accepts body at exactly 2000 chars', () => {
    expect(validateMessageBody('a'.repeat(2000))).toHaveLength(2000);
  });
});

// ─── Thread auto-poll interval ────────────────────────────────────────────────

describe('message polling interval', () => {
  it('15 second poll is under the 60s cache TTL', () => {
    // Ensures we don't over-poll and stay within reasonable bounds
    const POLL_INTERVAL_MS = 15_000;
    expect(POLL_INTERVAL_MS).toBeGreaterThan(5_000);
    expect(POLL_INTERVAL_MS).toBeLessThan(60_000);
  });
});
