import { describe, it, expect } from 'vitest';

/**
 * Unit tests for properties service helpers.
 */

// ─── Slug generation (copied from service) ────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Bahaghari Hostel')).toBe('bahaghari-hostel');
  });

  it('collapses multiple consecutive non-alphanumeric chars', () => {
    expect(slugify('The   Beach & Surf')).toBe('the-beach-surf');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' hello world ')).toBe('hello-world');
  });

  it('handles all-alphanumeric input unchanged', () => {
    expect(slugify('tara123')).toBe('tara123');
  });

  it('handles Philippine city names', () => {
    expect(slugify('El Nido Palawan')).toBe('el-nido-palawan');
  });
});

// ─── Amenity filter logic (mirrors listActive filter) ─────────────────────────

type Amenities = Record<string, boolean | undefined>;

function matchesAmenities(propertyAmenities: Amenities | null, required: string[]): boolean {
  if (required.length === 0) return true;
  const a = propertyAmenities ?? {};
  return required.every((k) => a[k] === true);
}

describe('matchesAmenities', () => {
  it('returns true when no amenities required', () => {
    expect(matchesAmenities(null, [])).toBe(true);
    expect(matchesAmenities({ wifi: true }, [])).toBe(true);
  });

  it('returns true when all required amenities present', () => {
    expect(matchesAmenities({ wifi: true, pool: true }, ['wifi'])).toBe(true);
    expect(matchesAmenities({ wifi: true, pool: true }, ['wifi', 'pool'])).toBe(true);
  });

  it('returns false when a required amenity is missing', () => {
    expect(matchesAmenities({ wifi: true }, ['wifi', 'pool'])).toBe(false);
  });

  it('returns false when amenity is false', () => {
    expect(matchesAmenities({ wifi: false }, ['wifi'])).toBe(false);
  });

  it('returns false when amenities is null and something is required', () => {
    expect(matchesAmenities(null, ['wifi'])).toBe(false);
  });
});

// ─── Price filter logic ────────────────────────────────────────────────────────

function matchesPrice(
  priceFrom: number | null,
  minPrice: number | undefined,
  maxPrice: number | undefined,
): boolean {
  if (minPrice != null && priceFrom != null && priceFrom < minPrice) return false;
  if (maxPrice != null && priceFrom != null && priceFrom > maxPrice) return false;
  return true;
}

describe('matchesPrice', () => {
  it('always matches when no bounds set', () => {
    expect(matchesPrice(null, undefined, undefined)).toBe(true);
    expect(matchesPrice(50000, undefined, undefined)).toBe(true);
  });

  it('matches when price is within bounds', () => {
    expect(matchesPrice(50000, 10000, 100000)).toBe(true);
  });

  it('returns false when price exceeds maxPrice', () => {
    expect(matchesPrice(150000, undefined, 100000)).toBe(false);
  });

  it('returns false when price is below minPrice', () => {
    expect(matchesPrice(5000, 10000, undefined)).toBe(false);
  });

  it('does not filter when priceFrom is null (unknown price)', () => {
    // Properties with unknown price pass through — they show as "Price on request"
    expect(matchesPrice(null, 10000, 100000)).toBe(true);
  });

  it('handles exact boundary values as matches', () => {
    expect(matchesPrice(100000, 50000, 100000)).toBe(true);
    expect(matchesPrice(50000, 50000, 100000)).toBe(true);
  });
});

// ─── Revenue calculation ──────────────────────────────────────────────────────

function calcTotal(amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

describe('revenue totals', () => {
  it('sums confirmed booking amounts', () => {
    expect(calcTotal([50000, 75000, 100000])).toBe(225000);
  });

  it('returns 0 for empty bookings', () => {
    expect(calcTotal([])).toBe(0);
  });

  it('handles a single booking', () => {
    expect(calcTotal([99900])).toBe(99900);
  });
});
