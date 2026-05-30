import { describe, it, expect } from 'vitest';

// ─── Owner reply ownership check (mirrors replyToReview guard logic) ───────────

function ownerCanReply(reviewTenantId: string, userTenantId: string): boolean {
  return reviewTenantId === userTenantId;
}

describe('review ownership check', () => {
  it('allows owner to reply to review on their property', () => {
    expect(ownerCanReply('tenant-abc', 'tenant-abc')).toBe(true);
  });

  it('denies reply when tenantIds differ', () => {
    expect(ownerCanReply('tenant-abc', 'tenant-xyz')).toBe(false);
  });

  it('is case-sensitive (tenantId is a UUID)', () => {
    expect(ownerCanReply('Tenant-ABC', 'tenant-abc')).toBe(false);
  });
});

// ─── listByOwner filter (mirrors SQL WHERE logic) ────────────────────────────

type FakeReview = { propertyTenantId: string; id: string };

function filterByOwner(reviews: FakeReview[], tenantId: string): FakeReview[] {
  return reviews.filter((r) => r.propertyTenantId === tenantId);
}

describe('listByOwner filtering', () => {
  const reviews: FakeReview[] = [
    { propertyTenantId: 'tenant-a', id: 'rev-1' },
    { propertyTenantId: 'tenant-a', id: 'rev-2' },
    { propertyTenantId: 'tenant-b', id: 'rev-3' },
  ];

  it('returns only reviews for the requesting owner', () => {
    const result = filterByOwner(reviews, 'tenant-a');
    expect(result.map((r) => r.id)).toEqual(['rev-1', 'rev-2']);
  });

  it('returns empty array when owner has no reviews', () => {
    const result = filterByOwner(reviews, 'tenant-c');
    expect(result).toHaveLength(0);
  });

  it('does not leak other owner reviews', () => {
    const result = filterByOwner(reviews, 'tenant-b');
    expect(result.every((r) => r.propertyTenantId === 'tenant-b')).toBe(true);
  });
});
