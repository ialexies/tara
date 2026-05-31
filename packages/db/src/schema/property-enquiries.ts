import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const propertyEnquiries = pgTable(
  'property_enquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('property_enquiries_property_idx').on(t.propertyId, t.createdAt),
    index('property_enquiries_tenant_idx').on(t.tenantId),
  ],
);

export type PropertyEnquiry = typeof propertyEnquiries.$inferSelect;
