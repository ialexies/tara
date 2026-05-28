import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const searchAlerts = pgTable(
  'search_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestEmail: text('guest_email').notNull(),
    city: text('city'),
    propertyType: text('property_type'),
    maxPriceMinor: integer('max_price_minor'),
    amenities: text('amenities').array(),
    lastNotifiedAt: timestamp('last_notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('search_alerts_email_idx').on(t.guestEmail),
  }),
);
