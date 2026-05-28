import { pgTable, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const guestBlacklist = pgTable(
  'guest_blacklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    ownerUid: text('owner_uid').notNull(),
    guestEmail: text('guest_email').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.propertyId, t.guestEmail),
    propertyIdx: index('guest_blacklist_property_idx').on(t.propertyId),
    emailIdx: index('guest_blacklist_email_idx').on(t.guestEmail),
  }),
);
