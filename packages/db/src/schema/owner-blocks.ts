import { pgTable, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const ownerBlocks = pgTable(
  'owner_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id),
    tenantId: text('tenant_id').notNull(),
    date: text('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('owner_blocks_property_date_uidx').on(t.propertyId, t.date),
    index('owner_blocks_property_id_idx').on(t.propertyId),
  ],
);
