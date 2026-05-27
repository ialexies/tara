import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.js';

/**
 * Units — the universal bookable abstraction.
 * Dorms: N units per room (one per bed), label = "Bunk A top", "Bed 3", etc.
 * Privates: exactly 1 unit per room, label = "(whole room)".
 * Bookings always reference unit_id — never room_id directly.
 * See docs/domain/01-inventory.md for rationale.
 */
export const units = pgTable(
  'units',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),

    // Denormalized from room.tenantId for index-friendly availability queries.
    tenantId: text('tenant_id').notNull(),

    // Human-readable label shown to guests.
    label: text('label').notNull(),

    // Sort order within the room.
    position: integer('position').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    isMock: boolean('is_mock').notNull().default(false),
  },
  (table) => ({
    roomIdx: index('units_room_idx').on(table.roomId),
    tenantIdx: index('units_tenant_idx').on(table.tenantId),
  }),
);

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
