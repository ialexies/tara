import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    senderUid: text('sender_uid').notNull(),
    senderName: text('sender_name').notNull().default(''),
    body: text('body').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_booking_idx').on(t.bookingId, t.createdAt)],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
