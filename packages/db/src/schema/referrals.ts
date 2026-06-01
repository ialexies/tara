import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerUid: text('referrer_uid').notNull(),
  referredEmail: text('referred_email').notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  discountApplied: boolean('discount_applied').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
