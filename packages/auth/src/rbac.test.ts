import { describe, it, expect } from 'vitest';
import { isOwner, isGuest, isAdmin, isOps, isStaff, canManageProperty, canBook } from './rbac.js';
import type { UserRole } from './rbac.js';

const ALL_ROLES: UserRole[] = ['guest', 'owner', 'admin', 'ops'];

describe('role predicates', () => {
  it.each([
    ['isGuest', isGuest, 'guest'],
    ['isOwner', isOwner, 'owner'],
    ['isAdmin', isAdmin, 'admin'],
    ['isOps', isOps, 'ops'],
  ] as const)('%s returns true only for matching role', (_name, fn, match) => {
    expect(fn(match as UserRole)).toBe(true);
    ALL_ROLES.filter((r) => r !== match).forEach((r) => expect(fn(r)).toBe(false));
  });

  it('isStaff returns true for admin and ops only', () => {
    expect(isStaff('admin')).toBe(true);
    expect(isStaff('ops')).toBe(true);
    expect(isStaff('guest')).toBe(false);
    expect(isStaff('owner')).toBe(false);
  });
});

describe('canManageProperty', () => {
  it('allows owner and staff', () => {
    expect(canManageProperty('owner')).toBe(true);
    expect(canManageProperty('admin')).toBe(true);
    expect(canManageProperty('ops')).toBe(true);
  });

  it('denies guest', () => {
    expect(canManageProperty('guest')).toBe(false);
  });
});

describe('canBook', () => {
  it('allows guest and staff', () => {
    expect(canBook('guest')).toBe(true);
    expect(canBook('admin')).toBe(true);
    expect(canBook('ops')).toBe(true);
  });

  it('denies owner', () => {
    expect(canBook('owner')).toBe(false);
  });
});
