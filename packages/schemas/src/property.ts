import { z } from 'zod';

export const CreatePropertySchema = z.object({
  name: z.string().min(2).max(120),
  propertyType: z.enum(['hostel', 'hotel', 'guesthouse', 'apartment', 'resort']),
  region: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  addressLine: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  paymentMode: z.enum(['manual', 'stripe']).default('manual'),
  manualPaymentMethods: z
    .object({
      gcash: z.string().optional(),
      maya: z.string().optional(),
      bank: z.string().optional(),
    })
    .optional(),
});

export type CreateProperty = z.infer<typeof CreatePropertySchema>;

const AmenitiesSchema = z
  .object({
    wifi: z.boolean().optional(),
    parking: z.boolean().optional(),
    pool: z.boolean().optional(),
    aircon: z.boolean().optional(),
    restaurant: z.boolean().optional(),
    bar: z.boolean().optional(),
    laundry: z.boolean().optional(),
    gym: z.boolean().optional(),
  })
  .optional();

export const UpdatePropertySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(2000).optional(),
  amenities: AmenitiesSchema,
  coverImageUrl: z.string().url().nullable().optional(),
  propertyType: z.enum(['hostel', 'hotel', 'guesthouse', 'apartment', 'resort']).optional(),
  region: z.string().min(1).max(80).optional(),
  city: z.string().min(1).max(80).optional(),
  addressLine: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  paymentMode: z.enum(['manual', 'stripe']).optional(),
  manualPaymentMethods: z
    .object({
      gcash: z.string().optional(),
      maya: z.string().optional(),
      bank: z.string().optional(),
    })
    .optional(),
  checkInTime: z.string().max(10).optional(),
  checkOutTime: z.string().max(10).optional(),
  houseRules: z.string().max(3000).optional(),
  checkInMessage: z.string().max(1000).optional(),
  contactPhone: z.string().max(30).optional(),
  freeCancelDays: z.number().int().min(0).max(60).optional(),
  partialRefundPercent: z.number().int().min(0).max(100).optional(),
});

export type UpdateProperty = z.infer<typeof UpdatePropertySchema>;

export const PropertySchema = CreatePropertySchema.extend({
  id: z.string().uuid(),
  slug: z.string(),
  tenantId: z.string(),
  ownerId: z.string().uuid(),
  status: z.enum(['draft', 'pending', 'active', 'paused', 'suspended', 'archived']),
  currency: z.string(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Property = z.infer<typeof PropertySchema>;
