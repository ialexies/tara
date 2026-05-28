import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.js';

export const roomImages = pgTable(
  'room_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('room_images_room_id_idx').on(t.roomId)],
);
