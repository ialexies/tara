import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { properties } from './properties.js';

export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    discountType: text('discount_type').notNull(),
    discountValue: integer('discount_value').notNull(),
    maxUses: integer('max_uses'),
    usesCount: integer('uses_count').notNull().default(0),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUid: text('created_by_uid').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('promo_codes_code_idx').on(sql`lower(${t.code})`),
    unique().on(t.code, t.propertyId),
    check('promo_codes_type_check', sql`${t.discountType} IN ('percent', 'flat')`),
  ],
);

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
