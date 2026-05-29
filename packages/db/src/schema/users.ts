import { sql } from 'drizzle-orm';
import { boolean, date, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext } from './_types.js';

export const userRoleEnum = pgEnum('user_role', ['guest', 'owner', 'admin', 'ops']);

/**
 * Users — profile data for Firebase-authenticated accounts.
 * Auth itself (password, email verification, OAuth) is handled by Firebase.
 * firebaseUid is the link to Firebase Auth.
 */
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  firebaseUid: text('firebase_uid').notNull().unique(),

  email: citext('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

  fullName: text('full_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  dateOfBirth: date('date_of_birth'),
  nationality: text('nationality'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  role: userRoleEnum('role').notNull().default('guest'),

  isMock: boolean('is_mock').notNull().default(false),
  referralCode: text('referral_code').unique(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
