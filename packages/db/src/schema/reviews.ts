import { pgTable, uuid, text, integer, timestamp, index, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { properties } from './properties.js';
import { bookings } from './bookings.js';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    guestName: text('guest_name').notNull(),
    guestUid: text('guest_uid'),
    rating: integer('rating').notNull(),
    body: text('body'),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('reviews_booking_id_uidx').on(t.bookingId),
    index('reviews_property_id_idx').on(t.propertyId),
    index('reviews_status_idx').on(t.status),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);
