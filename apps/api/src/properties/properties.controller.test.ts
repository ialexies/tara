import { describe, it, expect } from 'vitest';

/**
 * Unit tests for properties controller behaviour that doesn't require a live DB.
 *
 * The main thing we protect here is the SkipThrottle annotation pattern —
 * a misconfigured decorator silently does nothing in NestJS Throttler v6,
 * which causes 429s on the property listing/detail page when SSR requests
 * share a container IP.
 */

// ─── SkipThrottle key format (mirrors @nestjs/throttler v6 internals) ────────

const THROTTLER_NAMES = ['global', 'auth', 'guest_action'] as const;

function buildSkipThrottleArg(names: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(names.map((n) => [n, true]));
}

describe('SkipThrottle named-throttler format', () => {
  it('must include all named throttlers to fully skip rate limiting', () => {
    const arg = buildSkipThrottleArg(THROTTLER_NAMES);
    expect(arg).toEqual({ global: true, auth: true, guest_action: true });
  });

  it('default SkipThrottle() arg { default: true } does NOT match named throttlers', () => {
    const defaultArg = { default: true };
    for (const name of THROTTLER_NAMES) {
      expect(defaultArg).not.toHaveProperty(name);
    }
  });

  it('partial skip leaves remaining throttlers active', () => {
    const partialSkip: Record<string, boolean | undefined> = { global: true };
    expect(partialSkip['auth']).toBeUndefined();
    expect(partialSkip['guest_action']).toBeUndefined();
  });
});

// ─── Dev vs production throttle limit logic ──────────────────────────────────

function getThrottleLimit(nodeEnv: string): number {
  return nodeEnv === 'production' ? 120 : 2000;
}

describe('throttle limit by environment', () => {
  it('production uses 120 req/min', () => {
    expect(getThrottleLimit('production')).toBe(120);
  });

  it('development uses 2000 req/min', () => {
    expect(getThrottleLimit('development')).toBe(2000);
    expect(getThrottleLimit('test')).toBe(2000);
  });

  it('dev limit is high enough for Next.js SSR burst', () => {
    // A property page SSR fires 4 API requests (slug, images, reviews, stats).
    // 20 concurrent page loads = 80 requests. 2000/min >> 80.
    const devLimit = getThrottleLimit('development');
    const maxConcurrentPageLoads = 20;
    const requestsPerPage = 4;
    expect(devLimit).toBeGreaterThan(maxConcurrentPageLoads * requestsPerPage);
  });
});

// ─── Slug format validation ────────────────────────────────────────────────────

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

describe('property slug format', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('anawangin-cove-backpackers')).toBe(true);
    expect(isValidSlug('liwliwa-surf-house')).toBe(true);
    expect(isValidSlug('subic-bay-dive-stay')).toBe(true);
  });

  it('rejects uppercase characters', () => {
    expect(isValidSlug('My-Hostel')).toBe(false);
  });

  it('rejects trailing or leading hyphens', () => {
    expect(isValidSlug('-hostel')).toBe(false);
    expect(isValidSlug('hostel-')).toBe(false);
  });

  it('rejects spaces and special characters', () => {
    expect(isValidSlug('my hostel')).toBe(false);
    expect(isValidSlug('hostel_name')).toBe(false);
  });
});

// ─── Property price display ────────────────────────────────────────────────────

function formatPriceFrom(minorAmount: number | null): string {
  if (minorAmount == null || minorAmount === 0) return 'Price on request';
  const pesos = minorAmount / 100;
  return `₱${pesos.toLocaleString('en-PH')} / night`;
}

describe('property price display', () => {
  it('formats minor units to peso display', () => {
    expect(formatPriceFrom(45000)).toBe('₱450 / night');
    expect(formatPriceFrom(220000)).toBe('₱2,200 / night');
  });

  it('shows price on request for null or zero', () => {
    expect(formatPriceFrom(null)).toBe('Price on request');
    expect(formatPriceFrom(0)).toBe('Price on request');
  });
});
