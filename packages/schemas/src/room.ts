import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(2).max(120),
  roomType: z.enum(['dorm', 'private']),
  bathroomType: z.enum(['shared', 'private', 'ensuite']).optional(),
  capacity: z.number().int().min(1).max(100),
  maxOccupancy: z.number().int().min(1).optional(),
  gender: z.enum(['mixed', 'female', 'male']).optional(),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0).default(0),
  // Nightly rate in PHP centavos (minor units). ₱600 = 60000.
  baseNightlyRateMinor: z.number().int().min(1),
  hasAircon: z.boolean().default(false),
  hasWindow: z.boolean().default(false),
  hasLocker: z.boolean().default(false),
  hasOutletPerBed: z.boolean().default(false),
  // For dorms: custom labels per bed slot. Defaults to "Bed 1", "Bed 2", etc.
  bedLabels: z.array(z.string().min(1).max(40)).optional(),
});

export type CreateRoom = z.infer<typeof CreateRoomSchema>;

export const RoomSchema = CreateRoomSchema.extend({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  tenantId: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Room = z.infer<typeof RoomSchema>;

// capacity and roomType are intentionally excluded — changing them would invalidate units
export const UpdateRoomSchema = z.object({
  coverImageUrl: z.string().url().nullable().optional(),
  name: z.string().min(2).max(120).optional(),
  baseNightlyRateMinor: z.number().int().min(1).optional(),
  bathroomType: z.enum(['shared', 'private', 'ensuite']).optional(),
  gender: z.enum(['mixed', 'female', 'male']).nullable().optional(),
  description: z.string().max(1000).optional(),
  hasAircon: z.boolean().optional(),
  hasWindow: z.boolean().optional(),
  hasLocker: z.boolean().optional(),
  hasOutletPerBed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRoom = z.infer<typeof UpdateRoomSchema>;

export const UnitSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  tenantId: z.string(),
  label: z.string(),
  position: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Unit = z.infer<typeof UnitSchema>;
