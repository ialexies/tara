import { pgTable, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const propertyStaff = pgTable(
  'property_staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    ownerUid: text('owner_uid').notNull(),
    staffEmail: text('staff_email').notNull(),
    staffUid: text('staff_uid'),
    role: text('role').notNull().default('cohost'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.propertyId, t.staffEmail),
    propertyIdx: index('property_staff_property_idx').on(t.propertyId),
    uidIdx: index('property_staff_uid_idx').on(t.staffUid),
  }),
);
