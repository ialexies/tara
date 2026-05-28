import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, properties, rooms, units, bookings, bookingItems } from '@tara/db';
import { eq, and, isNull, inArray, notExists } from 'drizzle-orm';
import type { CreateBooking } from '@tara/schemas';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { EmailService } from '../email/email.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { AuditService } from '../audit/audit.service.js';
import { getFirebaseAdmin } from '../auth/firebase-admin.js';

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const cur = new Date(checkIn);
  const end = new Date(checkOut);
  while (cur < end) {
    nights.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return nights;
}

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TARA-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly auditService: AuditService,
  ) {}

  /** Returns available unit count per room for the given date range. */
  async checkAvailability(propertyId: string, checkIn: string, checkOut: string) {
    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in');

    const nights = nightsBetween(checkIn, checkOut);

    const propertyRooms = await db
      .select({
        roomId: rooms.id,
        roomName: rooms.name,
        roomType: rooms.roomType,
        capacity: rooms.capacity,
        gender: rooms.gender,
        baseNightlyRateMinor: rooms.baseNightlyRateMinor,
      })
      .from(rooms)
      .where(
        and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true), isNull(rooms.deletedAt)),
      );

    const result = await Promise.all(
      propertyRooms.map(async (room) => {
        const allUnits = await db
          .select({ id: units.id })
          .from(units)
          .where(
            and(eq(units.roomId, room.roomId), eq(units.isActive, true), isNull(units.deletedAt)),
          );

        // A unit is available only if it has NO booking_item for any of the requested nights.
        const availableUnits = await db
          .select({ id: units.id })
          .from(units)
          .where(
            and(
              eq(units.roomId, room.roomId),
              eq(units.isActive, true),
              isNull(units.deletedAt),
              notExists(
                db
                  .select({ id: bookingItems.id })
                  .from(bookingItems)
                  .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
                  .where(
                    and(
                      eq(bookingItems.unitId, units.id),
                      inArray(bookingItems.night, nights),
                      inArray(bookings.status, [
                        'stripe_pending',
                        'manual_pending',
                        'awaiting_verification',
                        'confirmed',
                        'checked_in',
                      ]),
                    ),
                  ),
              ),
            ),
          );

        return {
          roomId: room.roomId,
          roomName: room.roomName,
          roomType: room.roomType,
          capacity: room.capacity,
          gender: room.gender,
          baseNightlyRateMinor: room.baseNightlyRateMinor,
          totalUnits: allUnits.length,
          availableUnits: availableUnits.length,
        };
      }),
    );

    return result;
  }

  async create(input: CreateBooking, guestUid?: string) {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights.length === 0) throw new BadRequestException('Check-out must be after check-in');

    // Verify property exists and is active.
    const [property] = await db
      .select({
        id: properties.id,
        tenantId: properties.tenantId,
        paymentMode: properties.paymentMode,
        manualPaymentMethods: properties.manualPaymentMethods,
        slug: properties.slug,
        name: properties.name,
      })
      .from(properties)
      .where(
        and(
          eq(properties.id, input.propertyId),
          eq(properties.status, 'active'),
          isNull(properties.deletedAt),
        ),
      )
      .limit(1);

    if (!property) throw new NotFoundException('Property not found or not accepting bookings');

    // Verify room belongs to property.
    const [room] = await db
      .select({ id: rooms.id, baseNightlyRateMinor: rooms.baseNightlyRateMinor })
      .from(rooms)
      .where(
        and(
          eq(rooms.id, input.roomId),
          eq(rooms.propertyId, input.propertyId),
          eq(rooms.isActive, true),
          isNull(rooms.deletedAt),
        ),
      )
      .limit(1);

    if (!room) throw new NotFoundException('Room not found');

    // Find a free unit for all requested nights.
    const [freeUnit] = await db
      .select({ id: units.id })
      .from(units)
      .where(
        and(
          eq(units.roomId, input.roomId),
          eq(units.isActive, true),
          isNull(units.deletedAt),
          notExists(
            db
              .select({ id: bookingItems.id })
              .from(bookingItems)
              .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
              .where(
                and(
                  eq(bookingItems.unitId, units.id),
                  inArray(bookingItems.night, nights),
                  inArray(bookings.status, [
                    'manual_pending',
                    'awaiting_verification',
                    'confirmed',
                    'checked_in',
                  ]),
                ),
              ),
          ),
        ),
      )
      .limit(1);

    if (!freeUnit) throw new ConflictException('No availability for the selected dates');

    const totalMinor = room.baseNightlyRateMinor * nights.length;
    const referenceCode = generateReferenceCode();

    // Insert booking + booking_items in one transaction.
    // The unique index on (unit_id, night) is the last-resort double-booking guard.
    return db
      .transaction(async (tx) => {
        const [booking] = await tx
          .insert(bookings)
          .values({
            propertyId: input.propertyId,
            roomId: input.roomId,
            tenantId: property.tenantId,
            referenceCode,
            guestUid: guestUid ?? null,
            guestName: input.guestName,
            guestEmail: input.guestEmail,
            guestPhone: input.guestPhone ?? null,
            specialRequests: input.specialRequests ?? null,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            nights: nights.length,
            status: property.paymentMode === 'stripe' ? 'stripe_pending' : 'manual_pending',
            paymentMode: property.paymentMode,
            totalMinor,
            currency: 'PHP',
          })
          .returning();

        await tx.insert(bookingItems).values(
          nights.map((night) => ({
            bookingId: booking!.id,
            unitId: freeUnit.id,
            tenantId: property.tenantId,
            night,
            rateMinor: room.baseNightlyRateMinor,
            currency: 'PHP',
          })),
        );

        this.logger.log({
          event: 'booking.created',
          bookingId: booking!.id,
          referenceCode,
          propertyId: input.propertyId,
          tenantId: property.tenantId,
          nights: nights.length,
          totalMinor,
        });

        void this.auditService.log('booking.created', {
          actorUid: guestUid ?? null,
          entityType: 'booking',
          entityId: booking!.id,
          metadata: {
            referenceCode,
            propertyId: input.propertyId,
            roomId: input.roomId,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            nights: nights.length,
            totalMinor,
            paymentMode: property.paymentMode,
          },
        });

        return {
          ...booking!,
          paymentInstructions:
            property.paymentMode === 'stripe' ? null : property.manualPaymentMethods,
        };
      })
      .then(async (result) => {
        // Stripe flow: create checkout session and return URL (emails sent by webhook).
        if (property.paymentMode === 'stripe') {
          const [rm] = await db
            .select({ name: rooms.name })
            .from(rooms)
            .where(eq(rooms.id, input.roomId))
            .limit(1);
          try {
            const session = await this.stripeService.createCheckoutSession({
              bookingId: result.id,
              referenceCode: result.referenceCode,
              propertyName: property.name,
              propertySlug: property.slug,
              roomName: rm?.name ?? '',
              nights: nights.length,
              totalMinor: result.totalMinor,
            });
            await db
              .update(bookings)
              .set({ stripeSessionId: session.sessionId })
              .where(eq(bookings.id, result.id));
            return { ...result, checkoutUrl: session.url };
          } catch (err) {
            await db
              .update(bookings)
              .set({ status: 'cancelled', updatedAt: new Date() })
              .where(eq(bookings.id, result.id));
            throw err;
          }
        }

        // Manual flow: send confirmation emails.
        const [prop] = await db
          .select({
            name: properties.name,
            city: properties.city,
            region: properties.region,
            ownerId: properties.ownerId,
          })
          .from(properties)
          .where(eq(properties.id, input.propertyId))
          .limit(1);
        const [rm] = await db
          .select({ name: rooms.name })
          .from(rooms)
          .where(eq(rooms.id, input.roomId))
          .limit(1);

        const ctx = {
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          referenceCode: result.referenceCode,
          propertyName: prop?.name ?? '',
          propertyCity: prop?.city ?? '',
          roomName: rm?.name ?? '',
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights: nights.length,
          totalMinor: result.totalMinor,
          currency: result.currency,
          bookingUrl: `${process.env['WEB_URL'] ?? 'http://localhost:3000'}/en/bookings/${result.id}`,
          paymentInstructions: result.paymentInstructions as string | null | undefined,
        };

        await Promise.all([
          this.emailService.sendBookingReceived(ctx),
          prop?.ownerId
            ? getFirebaseAdmin()
                .auth()
                .getUser(prop.ownerId)
                .then((u) =>
                  u.email ? this.emailService.sendOwnerNewBooking(u.email, ctx) : Promise.resolve(),
                )
                .catch(() => undefined)
            : Promise.resolve(),
        ]);

        return result;
      })
      .catch((err: unknown) => {
        // Postgres unique violation on booking_items_unit_night_uidx — race condition
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
          throw new ConflictException('No availability for the selected dates');
        }
        throw err;
      });
  }

  async getById(id: string) {
    const [booking] = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
        propertySlug: properties.slug,
        propertyCity: properties.city,
        propertyRegion: properties.region,
        manualPaymentMethods: properties.manualPaymentMethods,
        roomName: rooms.name,
        roomType: rooms.roomType,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async listByProperty(propertyId: string, user: AuthedUser) {
    const [prop] = await db
      .select({ id: properties.id, tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);

    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    return db
      .select({
        booking: bookings,
        roomName: rooms.name,
      })
      .from(bookings)
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.propertyId, propertyId))
      .orderBy(bookings.createdAt);
  }

  async getBlockedDates(propertyId: string, from: string, to: string): Promise<string[]> {
    const allUnits = await db
      .select({ id: units.id })
      .from(units)
      .innerJoin(rooms, eq(units.roomId, rooms.id))
      .where(
        and(
          eq(rooms.propertyId, propertyId),
          eq(rooms.isActive, true),
          isNull(rooms.deletedAt),
          eq(units.isActive, true),
          isNull(units.deletedAt),
        ),
      );

    if (allUnits.length === 0) return [];

    const nights = nightsBetween(from, to);
    if (nights.length === 0) return [];

    const unitIds = allUnits.map((u) => u.id);

    const bookedItems = await db
      .select({ unitId: bookingItems.unitId, night: bookingItems.night })
      .from(bookingItems)
      .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
      .where(
        and(
          inArray(bookingItems.unitId, unitIds),
          inArray(bookingItems.night, nights),
          inArray(bookings.status, [
            'manual_pending',
            'awaiting_verification',
            'confirmed',
            'checked_in',
          ]),
        ),
      );

    const bookedByNight = new Map<string, Set<string>>();
    for (const item of bookedItems) {
      if (!bookedByNight.has(item.night)) bookedByNight.set(item.night, new Set());
      bookedByNight.get(item.night)!.add(item.unitId);
    }

    const unitIdSet = new Set(unitIds);
    return nights.filter((night) => {
      const booked = bookedByNight.get(night);
      if (!booked) return false;
      let count = 0;
      for (const uid of unitIdSet) if (booked.has(uid)) count++;
      return count >= allUnits.length;
    });
  }

  async listByGuest(guestUid: string) {
    return db
      .select({
        booking: bookings,
        propertyName: properties.name,
        propertySlug: properties.slug,
        propertyCity: properties.city,
        roomName: rooms.name,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.guestUid, guestUid))
      .orderBy(bookings.createdAt);
  }

  async confirm(id: string, user: AuthedUser) {
    const booking = await this.transitionStatus(
      id,
      user,
      ['manual_pending', 'awaiting_verification'],
      'confirmed',
    );
    await this.sendStatusEmail(booking, 'confirmed');
    return booking;
  }

  async cancel(id: string, user: AuthedUser) {
    const booking = await this.transitionStatus(
      id,
      user,
      ['manual_pending', 'awaiting_verification', 'confirmed'],
      'cancelled',
    );
    await this.sendStatusEmail(booking, 'cancelled');
    return booking;
  }

  private async sendStatusEmail(
    booking: {
      id: string;
      guestName: string;
      guestEmail: string;
      referenceCode: string;
      propertyId: string;
      roomId: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      totalMinor: number;
      currency: string;
    },
    status: 'confirmed' | 'cancelled',
  ) {
    try {
      const [prop] = await db
        .select({ name: properties.name, city: properties.city })
        .from(properties)
        .where(eq(properties.id, booking.propertyId))
        .limit(1);
      const [rm] = await db
        .select({ name: rooms.name })
        .from(rooms)
        .where(eq(rooms.id, booking.roomId))
        .limit(1);

      const ctx = {
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        referenceCode: booking.referenceCode,
        propertyName: prop?.name ?? '',
        propertyCity: prop?.city ?? '',
        roomName: rm?.name ?? '',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        totalMinor: booking.totalMinor,
        currency: booking.currency,
        bookingUrl: `${process.env['WEB_URL'] ?? 'http://localhost:3000'}/en/bookings/${booking.id}`,
      };

      if (status === 'confirmed') await this.emailService.sendBookingConfirmed(ctx);
      else await this.emailService.sendBookingCancelled(ctx);
    } catch (err) {
      this.logger.error({
        event: 'email.status_send_failed',
        bookingId: booking.id,
        error: String(err),
      });
    }
  }

  private async transitionStatus(
    id: string,
    user: AuthedUser,
    allowedFrom: string[],
    to: 'confirmed' | 'cancelled',
  ) {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, propertyId: bookings.propertyId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');

    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);

    if (!prop || prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your booking');
    if (!allowedFrom.includes(booking.status)) {
      throw new BadRequestException(`Cannot transition from ${booking.status} to ${to}`);
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    this.logger.log({ event: `booking.${to}`, bookingId: id, tenantId: user.tenantId });

    void this.auditService.log(to === 'confirmed' ? 'booking.confirmed' : 'booking.cancelled', {
      actorUid: user.uid,
      entityType: 'booking',
      entityId: id,
      metadata: { tenantId: user.tenantId, previousStatus: booking.status },
    });

    return updated!;
  }
}
