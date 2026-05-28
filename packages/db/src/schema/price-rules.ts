import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';
import { rooms } from './rooms.js';

export const priceRules = pgTable(
  'price_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    minNights: integer('min_nights'),
    rateOverrideMinor: integer('rate_override_minor'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('price_rules_property_id_idx').on(t.propertyId),
    index('price_rules_room_id_idx').on(t.roomId),
  ],
);
