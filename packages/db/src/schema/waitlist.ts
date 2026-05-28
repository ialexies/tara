import { pgTable, uuid, text, timestamp, date, unique, index } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.js';
import { properties } from './properties.js';

export const waitlist = pgTable(
  'waitlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    guestEmail: text('guest_email').notNull(),
    guestName: text('guest_name').notNull(),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.roomId, t.guestEmail, t.checkIn),
    roomIdx: index('waitlist_room_idx').on(t.roomId),
  }),
);
