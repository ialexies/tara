import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUid: text('owner_uid').notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    events: text('events')
      .array()
      .notNull()
      .default(['booking.created', 'booking.confirmed', 'booking.cancelled']),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index('webhooks_owner_idx').on(t.ownerUid),
  }),
);
