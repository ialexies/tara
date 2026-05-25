export type UserRole = 'guest' | 'owner' | 'admin' | 'ops';

export const ROLES = ['guest', 'owner', 'admin', 'ops'] as const satisfies UserRole[];

export function isOwner(role: UserRole): boolean {
  return role === 'owner';
}

export function isGuest(role: UserRole): boolean {
  return role === 'guest';
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isOps(role: UserRole): boolean {
  return role === 'ops';
}

export function isStaff(role: UserRole): boolean {
  return role === 'admin' || role === 'ops';
}

export function canManageProperty(role: UserRole): boolean {
  return role === 'owner' || isStaff(role);
}

export function canBook(role: UserRole): boolean {
  return role === 'guest' || isStaff(role);
}
