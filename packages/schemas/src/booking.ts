import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const CreateBookingSchema = z
  .object({
    propertyId: z.string().uuid(),
    roomId: z.string().uuid(),
    checkIn: dateString,
    checkOut: dateString,
    guestName: z.string().min(2).max(120),
    guestEmail: z.string().email(),
    guestPhone: z.string().max(30).optional(),
    specialRequests: z.string().max(500).optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: 'Check-out must be after check-in',
    path: ['checkOut'],
  });

export type CreateBooking = z.infer<typeof CreateBookingSchema>;
