import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const propertyImages = pgTable(
  'property_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('property_images_property_id_idx').on(t.propertyId)],
);
