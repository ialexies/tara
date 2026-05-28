import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Property type — what kind of accommodation this is.
 */
export const propertyTypeEnum = pgEnum('property_type', [
  'hostel',
  'hotel',
  'guesthouse',
  'apartment',
  'resort',
]);

/**
 * Property lifecycle status. See docs/architecture/diagrams.md section 12
 * (Owner lifecycle state machine — applied at property level here).
 */
export const propertyStatusEnum = pgEnum('property_status', [
  'draft', // owner created but not submitted
  'pending', // submitted for Tara review
  'active', // live, bookable
  'paused', // temporarily off, owner choice
  'suspended', // Tara-suspended for policy
  'archived', // soft-deleted
]);

/**
 * Payment mode per property. See ADR-0005.
 * - manual: guest pays owner directly via GCash/bank (Phase B on-ramp)
 * - stripe: full Stripe Connect flow with platform-held funds
 */
export const paymentModeEnum = pgEnum('payment_mode', ['manual', 'stripe']);

/**
 * Properties — the core inventory entity.
 * Multi-tenant: every query MUST filter by tenant_id (see ADR-0002).
 */
export const properties = pgTable(
  'properties',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Multi-tenancy — see ADR-0002.
    // Denormalized from owner.id for query performance + isolation enforcement.
    tenantId: text('tenant_id').notNull(),

    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Identity
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    propertyType: propertyTypeEnum('property_type').notNull(),

    // Location
    region: text('region').notNull(), // e.g. 'zambales', 'cebu'
    city: text('city').notNull(),
    addressLine: text('address_line'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),

    // Money + payment mode (ADR-0005)
    currency: text('currency').notNull().default('PHP'),
    paymentMode: paymentModeEnum('payment_mode').notNull().default('manual'),
    manualPaymentMethods: jsonb('manual_payment_methods'),
    // ^ shape: { gcash?, maya?, bank? } — see ADR-0005

    // Lifecycle
    status: propertyStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    amenities: jsonb('amenities'),
    // ^ shape: { wifi?, parking?, pool?, aircon?, restaurant?, bar?, laundry?, gym? }

    // Mock data flag — see docs/business/mock-data.md
    isMock: boolean('is_mock').notNull().default(false),
  },
  (table) => ({
    // Critical: tenant_id is the most common filter; index it heavily.
    tenantIdx: index('properties_tenant_idx').on(table.tenantId),
    ownerIdx: index('properties_owner_idx').on(table.ownerId),
    regionIdx: index('properties_region_idx').on(table.region),
    statusIdx: index('properties_status_idx').on(table.status),
    // Composite for the common "list active properties in a region" query
    regionStatusIdx: index('properties_region_status_idx').on(table.region, table.status),
  }),
);

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
