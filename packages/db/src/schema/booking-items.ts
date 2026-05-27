import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { units } from './units.js';

export const bookingItems = pgTable(
  'booking_items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),

    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),

    tenantId: text('tenant_id').notNull(),

    // The calendar night this item occupies (check_in=Jun1, check_out=Jun3 → Jun1, Jun2).
    night: date('night').notNull(),

    // Rate locked in at booking time in PHP centavos.
    rateMinor: integer('rate_minor').notNull(),
    currency: text('currency').notNull().default('PHP'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // This unique index is the double-booking safety net at the DB level.
    unitNightUidx: uniqueIndex('booking_items_unit_night_uidx').on(table.unitId, table.night),
    bookingIdx: index('booking_items_booking_idx').on(table.bookingId),
  }),
);

export type BookingItem = typeof bookingItems.$inferSelect;
export type NewBookingItem = typeof bookingItems.$inferInsert;
