import { sql } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext } from './_types';

/**
 * User roles in Tara.
 * - guest: someone who books
 * - owner: someone who lists property
 * - admin: Tara internal staff
 * - ops: Tara support/operations
 *
 * A user can have multiple roles (modeled separately in role_assignment).
 * Stored as enum for type safety + check constraints.
 */
export const userRoleEnum = pgEnum('user_role', ['guest', 'owner', 'admin', 'ops']);

/**
 * Users — authentication root.
 * Email is case-insensitive (citext). Password hash nullable for OAuth-only accounts.
 */
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

  // Display
  fullName: text('full_name'),

  // Lifecycle
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Mock data flag — see docs/business/mock-data.md
  isMock: boolean('is_mock').notNull().default(false),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
