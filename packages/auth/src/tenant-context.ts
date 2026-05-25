import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserRole } from './rbac.js';

export type TenantContext = {
  userId: string;
  tenantId: string;
  role: UserRole;
};

const store = new AsyncLocalStorage<TenantContext>();

export function withTenantContext<T>(context: TenantContext, fn: () => T): T {
  return store.run(context, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return store.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = store.getStore();
  if (!ctx) throw new Error('No tenant context — call withTenantContext first');
  return ctx;
}
