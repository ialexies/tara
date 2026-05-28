import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';

export const bookingDateChanges = pgTable(
  'booking_date_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    requestedCheckIn: text('requested_check_in').notNull(),
    requestedCheckOut: text('requested_check_out').notNull(),
    status: text('status').notNull().default('pending'),
    guestMessage: text('guest_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [index('booking_date_changes_booking_id_idx').on(t.bookingId)],
);
