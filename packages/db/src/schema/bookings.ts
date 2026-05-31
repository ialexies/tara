import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { properties } from './properties.js';
import { rooms } from './rooms.js';

export const bookingStatusEnum = pgEnum('booking_status', [
  'stripe_pending',
  'manual_pending',
  'awaiting_verification',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'refunded',
  'disputed',
]);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'restrict' }),

    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'restrict' }),

    tenantId: text('tenant_id').notNull(),

    // Human-readable reference shown to guest, e.g. TARA-X7K2MN
    referenceCode: text('reference_code').notNull().unique(),

    // Null when guest booked without an account
    guestUid: text('guest_uid'),

    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    guestPhone: text('guest_phone'),
    specialRequests: text('special_requests'),

    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    nights: integer('nights').notNull(),

    status: bookingStatusEnum('status').notNull().default('manual_pending'),

    paymentMode: text('payment_mode').notNull().default('manual'),

    // Total in PHP centavos (minor units) at booking time.
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull().default('PHP'),

    stripeSessionId: text('stripe_session_id').unique(),
    promoCodeId: uuid('promo_code_id'),
    discountMinor: integer('discount_minor').notNull().default(0),
    ownerNotes: text('owner_notes'),
    idVerified: boolean('id_verified').notNull().default(false),
    idVerifiedAt: timestamp('id_verified_at', { withTimezone: true }),
    idDocumentUrl: text('id_document_url'),
    paymentProofUrl: text('payment_proof_url'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    propertyIdx: index('bookings_property_idx').on(table.propertyId),
    guestEmailIdx: index('bookings_guest_email_idx').on(table.guestEmail),
  }),
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
