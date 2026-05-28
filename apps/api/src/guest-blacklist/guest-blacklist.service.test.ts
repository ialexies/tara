import { describe, it, expect } from 'vitest';

// ─── Email normalisation (mirrors service behaviour) ──────────────────────────

function normaliseEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isBlocked(blocklist: string[], guestEmail: string): boolean {
  return blocklist.includes(normaliseEmail(guestEmail));
}

describe('guest blacklist — email normalisation', () => {
  it('blocks exact lowercase match', () => {
    expect(isBlocked(['guest@example.com'], 'guest@example.com')).toBe(true);
  });

  it('blocks case-insensitive match', () => {
    expect(isBlocked(['guest@example.com'], 'GUEST@EXAMPLE.COM')).toBe(true);
    expect(isBlocked(['guest@example.com'], 'Guest@Example.Com')).toBe(true);
  });

  it('does not block a different email', () => {
    expect(isBlocked(['blocked@example.com'], 'allowed@example.com')).toBe(false);
  });

  it('does not block when list is empty', () => {
    expect(isBlocked([], 'anyone@example.com')).toBe(false);
  });

  it('blocks correctly when list has multiple entries', () => {
    const list = ['a@test.com', 'b@test.com', 'c@test.com'];
    expect(isBlocked(list, 'b@test.com')).toBe(true);
    expect(isBlocked(list, 'd@test.com')).toBe(false);
  });
});

// ─── Error message must not reveal reason to guest ────────────────────────────

const GUEST_VISIBLE_ERROR = 'Booking not available for this email address';

describe('blacklist error message', () => {
  it('is generic — does not say "blacklist" or "blocked"', () => {
    expect(GUEST_VISIBLE_ERROR.toLowerCase()).not.toContain('blacklist');
    expect(GUEST_VISIBLE_ERROR.toLowerCase()).not.toContain('blocked');
    expect(GUEST_VISIBLE_ERROR.toLowerCase()).not.toContain('ban');
  });
});
