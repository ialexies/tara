import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { properties } from './properties.js';

export const roomTypeEnum = pgEnum('room_type', ['dorm', 'private']);
export const bathroomTypeEnum = pgEnum('bathroom_type', ['shared', 'private', 'ensuite']);
export const genderPolicyEnum = pgEnum('gender_policy', ['mixed', 'female', 'male']);

/**
 * Rooms — a named physical space inside a property.
 * Dorms have N units (one per bed); privates have exactly 1 unit.
 * See docs/domain/01-inventory.md for the full model rationale.
 */
export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),

    // Denormalized for index-friendly multi-tenancy filtering on unit queries.
    tenantId: text('tenant_id').notNull(),

    name: text('name').notNull(),
    slug: text('slug').notNull(),

    roomType: roomTypeEnum('room_type').notNull(),
    bathroomType: bathroomTypeEnum('bathroom_type'),

    // Total sleeping positions (8 for an 8-bed dorm; same as 1 for a private).
    capacity: integer('capacity').notNull(),

    // Private rooms only — max guests that can stay.
    maxOccupancy: integer('max_occupancy'),

    // null means no gender restriction.
    gender: genderPolicyEnum('gender'),

    // Nightly rate in PHP centavos (minor units). ₱600 = 60000.
    baseNightlyRateMinor: integer('base_nightly_rate_minor').notNull().default(0),
    minNights: integer('min_nights').notNull().default(1),

    hasAircon: boolean('has_aircon').notNull().default(false),
    hasWindow: boolean('has_window').notNull().default(false),
    hasLocker: boolean('has_locker').notNull().default(false),
    hasOutletPerBed: boolean('has_outlet_per_bed').notNull().default(false),

    description: text('description'),

    // Display order within the property listing.
    position: integer('position').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    coverImageUrl: text('cover_image_url'),

    isMock: boolean('is_mock').notNull().default(false),
  },
  (table) => ({
    propertyIdx: index('rooms_property_idx').on(table.propertyId),
    tenantIdx: index('rooms_tenant_idx').on(table.tenantId),
  }),
);

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
