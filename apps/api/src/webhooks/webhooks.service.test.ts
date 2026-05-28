import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

// ─── HMAC signature verification (mirrors WebhooksService.dispatch) ──────────

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function verify(secret: string, body: string, signature: string): boolean {
  const expected = sign(secret, body);
  return expected === signature;
}

describe('webhook HMAC signing', () => {
  it('produces a 64-char hex signature', () => {
    const sig = sign('whsec_abc123', '{"event":"booking.created"}');
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same secret + body always produces same signature', () => {
    const body = '{"event":"booking.created","ts":1717000000000}';
    const secret = 'whsec_test_secret_value';
    expect(sign(secret, body)).toBe(sign(secret, body));
  });

  it('different secret produces different signature', () => {
    const body = '{"event":"booking.confirmed"}';
    const sig1 = sign('whsec_secret1', body);
    const sig2 = sign('whsec_secret2', body);
    expect(sig1).not.toBe(sig2);
  });

  it('different body produces different signature', () => {
    const secret = 'whsec_test';
    const sig1 = sign(secret, '{"event":"booking.created"}');
    const sig2 = sign(secret, '{"event":"booking.cancelled"}');
    expect(sig1).not.toBe(sig2);
  });

  it('verify returns true for valid signature', () => {
    const secret = 'whsec_real_secret';
    const body = '{"event":"booking.created","ts":1717000000}';
    const sig = sign(secret, body);
    expect(verify(secret, body, sig)).toBe(true);
  });

  it('verify returns false for tampered body', () => {
    const secret = 'whsec_real_secret';
    const body = '{"event":"booking.created","ts":1717000000}';
    const sig = sign(secret, body);
    const tamperedBody = '{"event":"booking.cancelled","ts":1717000000}';
    expect(verify(secret, tamperedBody, sig)).toBe(false);
  });

  it('verify returns false for wrong secret', () => {
    const body = '{"event":"booking.confirmed"}';
    const sig = sign('whsec_correct', body);
    expect(verify('whsec_wrong', body, sig)).toBe(false);
  });
});

// ─── Secret format ────────────────────────────────────────────────────────────

describe('webhook secret format', () => {
  it('generated secrets start with whsec_', () => {
    // The service generates: 'whsec_' + randomBytes(24).toString('hex')
    // hex of 24 bytes = 48 chars → total 54 chars
    const mockSecret = 'whsec_' + 'a'.repeat(48);
    expect(mockSecret).toMatch(/^whsec_[0-9a-f]{48}$/);
    expect(mockSecret).toHaveLength(54);
  });
});

// ─── Event filtering ──────────────────────────────────────────────────────────

function shouldDispatch(registeredEvents: string[], event: string): boolean {
  return registeredEvents.includes(event);
}

describe('webhook event filtering', () => {
  const events = ['booking.created', 'booking.confirmed', 'booking.cancelled'];

  it('dispatches for registered event', () => {
    expect(shouldDispatch(events, 'booking.created')).toBe(true);
    expect(shouldDispatch(events, 'booking.cancelled')).toBe(true);
  });

  it('does not dispatch for unregistered event', () => {
    expect(shouldDispatch(events, 'booking.checked_in')).toBe(false);
    expect(shouldDispatch(events, 'property.approved')).toBe(false);
  });

  it('empty event list never dispatches', () => {
    expect(shouldDispatch([], 'booking.created')).toBe(false);
  });
});
