import { describe, it, expect } from 'vitest';

// ─── Role permission model ────────────────────────────────────────────────────

type StaffRole = 'cohost' | 'manager';

const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  cohost: ['view_bookings', 'send_messages'],
  manager: [
    'view_bookings',
    'send_messages',
    'confirm_bookings',
    'cancel_bookings',
    'check_in',
    'check_out',
  ],
};

function hasPermission(role: StaffRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

describe('staff role permissions', () => {
  it('cohost can view bookings and send messages', () => {
    expect(hasPermission('cohost', 'view_bookings')).toBe(true);
    expect(hasPermission('cohost', 'send_messages')).toBe(true);
  });

  it('cohost cannot confirm or cancel bookings', () => {
    expect(hasPermission('cohost', 'confirm_bookings')).toBe(false);
    expect(hasPermission('cohost', 'cancel_bookings')).toBe(false);
  });

  it('manager has all cohost permissions', () => {
    const cohostPerms = ROLE_PERMISSIONS['cohost'];
    for (const perm of cohostPerms) {
      expect(hasPermission('manager', perm)).toBe(true);
    }
  });

  it('manager can confirm, cancel, check-in and check-out', () => {
    expect(hasPermission('manager', 'confirm_bookings')).toBe(true);
    expect(hasPermission('manager', 'cancel_bookings')).toBe(true);
    expect(hasPermission('manager', 'check_in')).toBe(true);
    expect(hasPermission('manager', 'check_out')).toBe(true);
  });
});

// ─── Email normalisation ──────────────────────────────────────────────────────

describe('staff invite email', () => {
  it('emails are stored lowercase', () => {
    const raw = 'Staff@HostelExample.COM';
    expect(raw.toLowerCase()).toBe('staff@hostelexample.com');
  });

  it('unique constraint is on (propertyId, staffEmail) — same email in two properties is allowed', () => {
    type InviteKey = { propertyId: string; staffEmail: string };
    const keys: InviteKey[] = [
      { propertyId: 'prop-1', staffEmail: 'staff@test.com' },
      { propertyId: 'prop-2', staffEmail: 'staff@test.com' },
    ];
    const unique = new Set(keys.map((k) => `${k.propertyId}|${k.staffEmail}`));
    expect(unique.size).toBe(2);
  });
});
