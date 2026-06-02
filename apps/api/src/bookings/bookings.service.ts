import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  db,
  properties,
  rooms,
  units,
  bookings,
  bookingItems,
  ownerBlocks,
  bookingDateChanges,
  messages,
} from '@tara/db';
import { eq, and, isNull, inArray, notExists, gte, lte, sql, count, sum, desc } from 'drizzle-orm';
import type { CreateBooking } from '@tara/schemas';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { PushService } from '../push/push.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PriceRulesService } from '../price-rules/price-rules.service.js';
import { PromoCodesService } from '../promo-codes/promo-codes.service.js';
import { GuestBlacklistService } from '../guest-blacklist/guest-blacklist.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';
import { WebhooksService } from '../webhooks/webhooks.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { ReferralsService } from '../referrals/referrals.service.js';
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
    private readonly whatsapp: WhatsAppService,
    private readonly stripeService: StripeService,
    private readonly auditService: AuditService,
    private readonly priceRulesService: PriceRulesService,
    private readonly promoCodesService: PromoCodesService,
    private readonly blacklistService: GuestBlacklistService,
    private readonly waitlistService: WaitlistService,
    private readonly webhooksService: WebhooksService,
    private readonly uploadsService: UploadsService,
    private readonly referralsService: ReferralsService,
    private readonly pushService: PushService,
  ) {}

  /** Returns available unit count per room for the given date range. */
  async checkAvailability(propertyId: string, checkIn: string, checkOut: string) {
    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in');

    const nights = nightsBetween(checkIn, checkOut);
    const nightCount = nights.length;

    const [propertyRooms, applicableRules] = await Promise.all([
      db
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
        ),
      this.priceRulesService.getApplicableRules(propertyId, checkIn, checkOut),
    ]);

    // Property-level rules (no roomId) apply to all rooms.
    const propertyRules = applicableRules.filter((r) => !r.roomId);

    const result = await Promise.all(
      propertyRooms.map(async (room) => {
        const allUnits = await db
          .select({ id: units.id })
          .from(units)
          .where(
            and(eq(units.roomId, room.roomId), eq(units.isActive, true), isNull(units.deletedAt)),
          );

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

        // Apply price rules: room-specific rules take precedence over property-level ones.
        const roomRules = applicableRules.filter((r) => r.roomId === room.roomId);
        const allApplicable = [...propertyRules, ...roomRules];
        const rateOverride = [...allApplicable]
          .reverse()
          .find((r) => r.rateOverrideMinor != null)?.rateOverrideMinor;
        const minNights = allApplicable.reduce<number | null>(
          (max, r) => (r.minNights != null ? Math.max(max ?? 0, r.minNights) : max),
          null,
        );

        return {
          roomId: room.roomId,
          roomName: room.roomName,
          roomType: room.roomType,
          capacity: room.capacity,
          gender: room.gender,
          baseNightlyRateMinor: rateOverride ?? room.baseNightlyRateMinor,
          totalUnits: allUnits.length,
          availableUnits: availableUnits.length,
          minNights,
          meetsMinNights: minNights == null || nightCount >= minNights,
        };
      }),
    );

    return result;
  }

  async create(input: CreateBooking, guestUid?: string) {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights.length === 0) throw new BadRequestException('Check-out must be after check-in');

    // Check applicable price rules for min-nights constraint.
    const rules = await this.priceRulesService.getApplicableRules(
      input.propertyId,
      input.checkIn,
      input.checkOut,
    );
    const roomRules = rules.filter((r) => !r.roomId || r.roomId === input.roomId);
    const minNights = roomRules.reduce<number | null>(
      (max, r) => (r.minNights != null ? Math.max(max ?? 0, r.minNights) : max),
      null,
    );
    if (minNights != null && nights.length < minNights) {
      throw new BadRequestException(
        `A minimum stay of ${minNights} nights is required for these dates`,
      );
    }

    // Verify property exists and is active.
    const [property] = await db
      .select({
        id: properties.id,
        tenantId: properties.tenantId,
        paymentMode: properties.paymentMode,
        manualPaymentMethods: properties.manualPaymentMethods,
        slug: properties.slug,
        name: properties.name,
        ownerId: properties.ownerId,
        contactPhone: properties.contactPhone,
        stripeConnectAccountId: properties.stripeConnectAccountId,
        stripeConnectEnabled: properties.stripeConnectEnabled,
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

    // Reject if guest is blacklisted by this property owner
    const isBlocked = await this.blacklistService.isBlocked(input.propertyId, input.guestEmail);
    if (isBlocked) throw new ForbiddenException('Booking not available for this email address');

    // Require phone number for manual-payment properties to reduce no-shows
    if (property.paymentMode === 'manual' && !input.guestPhone) {
      throw new BadRequestException('Phone number is required for this property.');
    }

    // Verify room belongs to property.
    const [room] = await db
      .select({
        id: rooms.id,
        baseNightlyRateMinor: rooms.baseNightlyRateMinor,
        minNights: rooms.minNights,
      })
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

    // Enforce room-level minimum stay
    const roomMinNights = room.minNights ?? 1;
    if (nights.length < roomMinNights) {
      throw new BadRequestException(
        `This room requires a minimum stay of ${roomMinNights} night${roomMinNights !== 1 ? 's' : ''}.`,
      );
    }

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

    const baseTotalMinor = room.baseNightlyRateMinor * nights.length;

    // Apply promo code if provided
    let promoCodeId: string | null = null;
    let discountMinor = 0;
    let totalMinor = baseTotalMinor;
    if (input.promoCode) {
      try {
        const promo = await this.promoCodesService.validate(
          input.promoCode,
          input.propertyId,
          baseTotalMinor,
        );
        promoCodeId = promo.id;
        discountMinor = promo.discountMinor;
        totalMinor = promo.finalAmountMinor;
      } catch {
        throw new BadRequestException(`Promo code "${input.promoCode}" is invalid or expired`);
      }
    }

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
            discountMinor,
            promoCodeId: promoCodeId ?? undefined,
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
          paymentInstructions: (() => {
            if (property.paymentMode === 'stripe' || !property.manualPaymentMethods) return null;
            const m = property.manualPaymentMethods as Record<string, string>;
            return Object.entries(m)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
              .join('\n');
          })(),
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
              connectAccountId: property.stripeConnectEnabled
                ? (property.stripeConnectAccountId ?? null)
                : null,
              guestEmail: input.guestEmail,
              guestName: input.guestName,
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

        const guestPhone = (result as { guestPhone?: string | null }).guestPhone ?? '';
        const ownerPhone = property.contactPhone ?? '';
        await Promise.all([
          this.emailService.sendBookingReceived(ctx),
          guestPhone
            ? this.whatsapp.sendBookingReceived({ ...ctx, guestPhone })
            : Promise.resolve(),
          prop?.ownerId
            ? getFirebaseAdmin()
                .auth()
                .getUser(prop.ownerId)
                .then((u) =>
                  u.email ? this.emailService.sendOwnerNewBooking(u.email, ctx) : Promise.resolve(),
                )
                .catch(() => undefined)
            : Promise.resolve(),
          ownerPhone
            ? this.whatsapp.sendOwnerNewBooking(ownerPhone, {
                ...ctx,
                guestPhone: guestPhone || ownerPhone,
              })
            : Promise.resolve(),
        ]);

        // Atomically increment promo code usage — conditional UPDATE prevents TOCTOU race
        if (promoCodeId) {
          const incremented = await this.promoCodesService.incrementUses(promoCodeId);
          if (!incremented) {
            // Another concurrent booking just hit the limit; roll back by throwing
            throw new ConflictException('Promo code has reached its usage limit');
          }
        }

        // Fire webhook for property owner
        if (prop?.ownerId) {
          void this.webhooksService.dispatch(prop.ownerId, 'booking.created', {
            bookingId: result.id,
            referenceCode: ctx.referenceCode,
            guestName: ctx.guestName,
          });
        }

        // Mark referral conversion — fire-and-forget, never blocks the booking
        void this.referralsService.markConversion(input.guestEmail, result.id);

        // Push: notify owner of new booking
        void this.pushService.sendToUser(
          property.tenantId,
          'New booking',
          `${input.guestName} booked ${property.name}`,
          { url: `/en/dashboard/bookings` },
        );

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
        propertyContactPhone: properties.contactPhone,
        checkInMessage: properties.checkInMessage,
        freeCancelDays: properties.freeCancelDays,
        partialRefundPercent: properties.partialRefundPercent,
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

  async getByReferenceCode(code: string) {
    const [booking] = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
        propertySlug: properties.slug,
        propertyCity: properties.city,
        propertyRegion: properties.region,
        manualPaymentMethods: properties.manualPaymentMethods,
        propertyContactPhone: properties.contactPhone,
        checkInMessage: properties.checkInMessage,
        freeCancelDays: properties.freeCancelDays,
        partialRefundPercent: properties.partialRefundPercent,
        roomName: rooms.name,
        roomType: rooms.roomType,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.referenceCode, code.toUpperCase()))
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
    const bookingBlocked = nights.filter((night) => {
      const booked = bookedByNight.get(night);
      if (!booked) return false;
      let count = 0;
      for (const uid of unitIdSet) if (booked.has(uid)) count++;
      return count >= allUnits.length;
    });

    const ownerBlockedRows = await db
      .select({ date: ownerBlocks.date })
      .from(ownerBlocks)
      .where(
        and(
          eq(ownerBlocks.propertyId, propertyId),
          gte(ownerBlocks.date, from),
          lte(ownerBlocks.date, to),
        ),
      );

    const ownerBlockedSet = new Set(ownerBlockedRows.map((r) => r.date));
    const allBlocked = new Set([...bookingBlocked, ...ownerBlockedSet]);
    return nights.filter((n) => allBlocked.has(n));
  }

  async getOwnerBlocks(propertyId: string, from: string, to: string, user: AuthedUser) {
    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    const rows = await db
      .select({ date: ownerBlocks.date })
      .from(ownerBlocks)
      .where(
        and(
          eq(ownerBlocks.propertyId, propertyId),
          gte(ownerBlocks.date, from),
          lte(ownerBlocks.date, to),
        ),
      );
    return rows.map((r) => r.date);
  }

  async setOwnerBlock(propertyId: string, date: string, user: AuthedUser) {
    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    await db
      .insert(ownerBlocks)
      .values({ propertyId, tenantId: user.tenantId, date })
      .onConflictDoNothing();
  }

  async deleteOwnerBlock(propertyId: string, date: string, user: AuthedUser) {
    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    await db
      .delete(ownerBlocks)
      .where(and(eq(ownerBlocks.propertyId, propertyId), eq(ownerBlocks.date, date)));
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

  async getOwnerSummary(user: AuthedUser) {
    const ownedProps = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.tenantId, user.tenantId), isNull(properties.deletedAt)));

    if (ownedProps.length === 0) {
      return { pendingCount: 0, todayCheckIns: 0, unreadMessages: 0, monthRevenueMinor: 0 };
    }

    const propIds = ownedProps.map((p) => p.id);
    const today = new Date().toISOString().slice(0, 10);

    const [[pending], [todayCI], [unread], [revenue]] = await Promise.all([
      db
        .select({ c: count() })
        .from(bookings)
        .where(
          and(
            inArray(bookings.propertyId, propIds),
            inArray(bookings.status, ['manual_pending', 'awaiting_verification']),
          ),
        ),
      db
        .select({ c: count() })
        .from(bookings)
        .where(
          and(
            inArray(bookings.propertyId, propIds),
            eq(bookings.status, 'confirmed'),
            eq(bookings.checkIn, today),
          ),
        ),
      db
        .select({ c: count() })
        .from(messages)
        .innerJoin(bookings, eq(messages.bookingId, bookings.id))
        .where(
          and(
            inArray(bookings.propertyId, propIds),
            eq(messages.isRead, false),
            sql`${messages.senderUid} != ${user.uid}`,
          ),
        ),
      db
        .select({ s: sum(bookings.totalMinor) })
        .from(bookings)
        .where(
          and(
            inArray(bookings.propertyId, propIds),
            inArray(bookings.status, ['confirmed', 'checked_in', 'checked_out']),
            sql`date_trunc('month', ${bookings.checkIn}::date) = date_trunc('month', now())`,
          ),
        ),
    ]);

    return {
      pendingCount: pending?.c ?? 0,
      todayCheckIns: todayCI?.c ?? 0,
      unreadMessages: unread?.c ?? 0,
      monthRevenueMinor: revenue?.s ? parseInt(String(revenue.s), 10) : 0,
    };
  }

  async adminListAllBookings(opts: { status?: string; limit: number; offset: number }) {
    return db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        guestEmail: bookings.guestEmail,
        guestName: bookings.guestName,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        totalMinor: bookings.totalMinor,
        status: bookings.status,
        paymentMode: bookings.paymentMode,
        createdAt: bookings.createdAt,
        propertyName: properties.name,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .where(opts.status ? eq(bookings.status, opts.status as 'confirmed') : undefined)
      .orderBy(desc(bookings.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async confirm(id: string, user: AuthedUser) {
    const booking = await this.transitionStatus(
      id,
      user,
      ['manual_pending', 'awaiting_verification'],
      'confirmed',
    );
    await this.sendStatusEmail(booking, 'confirmed');
    if (booking.guestUid) {
      void this.pushService.sendToUser(
        booking.guestUid,
        'Booking confirmed',
        'Your booking has been confirmed!',
        { url: `/en/bookings/${booking.id}` },
      );
    }
    return booking;
  }

  async cancel(id: string, user: AuthedUser) {
    // Fetch the full booking before transitioning so we have stripe/payment fields.
    const [pre] = await db
      .select({ stripeSessionId: bookings.stripeSessionId, paymentMode: properties.paymentMode })
      .from(bookings)
      .innerJoin(properties, eq(properties.id, bookings.propertyId))
      .where(eq(bookings.id, id))
      .limit(1);

    const booking = await this.transitionStatus(
      id,
      user,
      ['manual_pending', 'awaiting_verification', 'confirmed'],
      'cancelled',
    );

    // Issue Stripe refund if the booking was paid by card.
    if (pre?.paymentMode === 'stripe' && pre?.stripeSessionId) {
      void this.stripeService.refundBySessionId(pre.stripeSessionId);
    }

    await this.sendStatusEmail(booking, 'cancelled');
    void this.waitlistService.notifyOnCancellation(
      booking.roomId,
      booking.checkIn,
      booking.checkOut,
    );
    if (booking.guestUid) {
      void this.pushService.sendToUser(
        booking.guestUid,
        'Booking cancelled',
        'Your booking has been cancelled.',
        { url: `/en/bookings/${booking.id}` },
      );
    }
    return booking;
  }

  async checkIn(id: string, user: AuthedUser) {
    return this.transitionStatus(id, user, ['confirmed'], 'checked_in');
  }

  async checkOut(id: string, user: AuthedUser) {
    return this.transitionStatus(id, user, ['checked_in'], 'checked_out');
  }

  async markIdVerified(id: string, user: AuthedUser) {
    const [booking] = await db
      .select({ id: bookings.id, propertyId: bookings.propertyId })
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
    await db
      .update(bookings)
      .set({ idVerified: true, idVerifiedAt: new Date() })
      .where(eq(bookings.id, id));
    return { ok: true };
  }

  async getPaymentProofUploadUrl(id: string, contentType: string, guestEmail: string) {
    const [booking] = await db
      .select({ id: bookings.id, guestEmail: bookings.guestEmail, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      throw new ForbiddenException('Email does not match');
    }
    if (booking.status !== 'manual_pending') {
      throw new BadRequestException('Payment proof can only be uploaded for pending bookings');
    }
    const key = `payment-proofs/${id}/${Date.now()}`;
    return this.uploadsService.presignUpload({ key, contentType });
  }

  async savePaymentProofUrl(id: string, proofUrl: string, guestEmail: string) {
    const [booking] = await db
      .select({ id: bookings.id, guestEmail: bookings.guestEmail })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      throw new ForbiddenException('Email does not match');
    }
    await db.update(bookings).set({ paymentProofUrl: proofUrl }).where(eq(bookings.id, id));
    this.logger.log({ event: 'booking.payment_proof_uploaded', bookingId: id });
    return { ok: true };
  }

  async getIdUploadUrl(id: string, contentType: string, guestEmail: string) {
    const [booking] = await db
      .select({ id: bookings.id, guestEmail: bookings.guestEmail, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      throw new ForbiddenException('Email does not match');
    }
    const key = `id-docs/${id}/${Date.now()}`;
    return this.uploadsService.presignUpload({ key, contentType });
  }

  async saveIdDocumentUrl(id: string, documentUrl: string, guestEmail: string) {
    const [booking] = await db
      .select({ id: bookings.id, guestEmail: bookings.guestEmail })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      throw new ForbiddenException('Email does not match');
    }
    await db.update(bookings).set({ idDocumentUrl: documentUrl }).where(eq(bookings.id, id));
    this.logger.log({ event: 'booking.id_document_uploaded', bookingId: id });
    return { ok: true };
  }

  async cancelByGuest(id: string, guestEmail: string) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      throw new ForbiddenException('Email does not match');
    }
    if (!['manual_pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a booking with status "${booking.status}"`);
    }

    // Determine refund eligibility based on property cancellation policy
    const [prop] = await db
      .select({
        freeCancelDays: properties.freeCancelDays,
        partialRefundPercent: properties.partialRefundPercent,
      })
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);

    const daysUntilCheckIn = Math.ceil(
      (new Date(booking.checkIn).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const freeDays = prop?.freeCancelDays ?? 3;
    const refundPct = prop?.partialRefundPercent ?? 50;
    const refundPercent = freeDays > 0 && daysUntilCheckIn >= freeDays ? 100 : refundPct;

    const [updated] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Release the units so the dates become bookable again
    await db.delete(bookingItems).where(eq(bookingItems.bookingId, id));

    this.logger.log({
      event: 'booking.cancelled_by_guest',
      bookingId: id,
      daysUntilCheckIn,
      refundPercent,
    });
    await this.sendStatusEmail(updated!, 'cancelled');
    // The guest cancelled themselves — no push needed (they know)
    return { ...updated!, refundPercent };
  }

  private async sendStatusEmail(
    booking: {
      id: string;
      guestName: string;
      guestEmail: string;
      guestPhone?: string | null;
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
        .select({
          name: properties.name,
          city: properties.city,
          checkInMessage: properties.checkInMessage,
        })
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
        checkInMessage: prop?.checkInMessage ?? null,
      };

      const phone = booking.guestPhone ?? '';
      if (status === 'confirmed') {
        await Promise.all([
          this.emailService.sendBookingConfirmed(ctx),
          phone
            ? this.whatsapp.sendBookingConfirmed({ ...ctx, guestPhone: phone })
            : Promise.resolve(),
        ]);
      } else {
        await Promise.all([
          this.emailService.sendBookingCancelled(ctx),
          phone
            ? this.whatsapp.sendBookingCancelled({ ...ctx, guestPhone: phone })
            : Promise.resolve(),
        ]);
      }
    } catch (err) {
      this.logger.error({
        event: 'email.status_send_failed',
        bookingId: booking.id,
        error: String(err),
      });
    }
  }

  async requestDateChange(
    bookingId: string,
    requestedCheckIn: string,
    requestedCheckOut: string,
    guestEmail: string,
    guestMessage?: string,
  ) {
    if (requestedCheckOut <= requestedCheckIn)
      throw new BadRequestException('Check-out must be after check-in');

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestEmail.toLowerCase() !== guestEmail.toLowerCase())
      throw new ForbiddenException('Email does not match');
    if (booking.status !== 'confirmed')
      throw new BadRequestException('Can only request changes on confirmed bookings');

    const existing = await db
      .select({ id: bookingDateChanges.id })
      .from(bookingDateChanges)
      .where(
        and(eq(bookingDateChanges.bookingId, bookingId), eq(bookingDateChanges.status, 'pending')),
      )
      .limit(1);
    if (existing.length > 0)
      throw new ConflictException('A modification request is already pending');

    const [created] = await db
      .insert(bookingDateChanges)
      .values({
        bookingId,
        requestedCheckIn,
        requestedCheckOut,
        guestMessage: guestMessage ?? null,
      })
      .returning();

    this.logger.log({
      event: 'booking.modification_requested',
      bookingId,
      requestedCheckIn,
      requestedCheckOut,
    });
    return created!;
  }

  async listModificationRequests(bookingId: string, user: AuthedUser) {
    const [booking] = await db
      .select({ propertyId: bookings.propertyId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');

    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);
    if (!prop || prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your booking');

    return db
      .select()
      .from(bookingDateChanges)
      .where(eq(bookingDateChanges.bookingId, bookingId))
      .orderBy(bookingDateChanges.createdAt);
  }

  async resolveModificationRequest(
    bookingId: string,
    requestId: string,
    action: 'approved' | 'rejected',
    user: AuthedUser,
  ) {
    const [booking] = await db
      .select({ propertyId: bookings.propertyId, roomId: bookings.roomId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) throw new NotFoundException('Booking not found');

    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);
    if (!prop || prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your booking');

    const [request] = await db
      .select()
      .from(bookingDateChanges)
      .where(and(eq(bookingDateChanges.id, requestId), eq(bookingDateChanges.bookingId, bookingId)))
      .limit(1);
    if (!request) throw new NotFoundException('Modification request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request already resolved');

    if (action === 'rejected') {
      await db
        .update(bookingDateChanges)
        .set({ status: 'rejected', resolvedAt: new Date() })
        .where(eq(bookingDateChanges.id, requestId));
      this.logger.log({ event: 'booking.modification_rejected', bookingId, requestId });
      return { ok: true };
    }

    // Approval: rebook same unit onto new nights inside a transaction.
    const newNights = nightsBetween(request.requestedCheckIn, request.requestedCheckOut);

    const [currentItem] = await db
      .select({
        unitId: bookingItems.unitId,
        rateMinor: bookingItems.rateMinor,
        tenantId: bookingItems.tenantId,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId))
      .limit(1);
    if (!currentItem) throw new BadRequestException('No booking items found');

    await db
      .transaction(async (tx) => {
        await tx.delete(bookingItems).where(eq(bookingItems.bookingId, bookingId));

        await tx.insert(bookingItems).values(
          newNights.map((night) => ({
            bookingId,
            unitId: currentItem.unitId,
            tenantId: currentItem.tenantId,
            night,
            rateMinor: currentItem.rateMinor,
            currency: 'PHP',
          })),
        );

        await tx
          .update(bookings)
          .set({
            checkIn: request.requestedCheckIn,
            checkOut: request.requestedCheckOut,
            nights: newNights.length,
            totalMinor: currentItem.rateMinor * newNights.length,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, bookingId));

        await tx
          .update(bookingDateChanges)
          .set({ status: 'approved', resolvedAt: new Date() })
          .where(eq(bookingDateChanges.id, requestId));
      })
      .catch((err: unknown) => {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
          throw new ConflictException('The requested dates are no longer available');
        }
        throw err;
      });

    this.logger.log({ event: 'booking.modification_approved', bookingId, requestId });
    return { ok: true };
  }

  private async transitionStatus(
    id: string,
    user: AuthedUser,
    allowedFrom: string[],
    to: 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out',
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

    // Release the units when cancelling so dates become bookable again
    if (to === 'cancelled') {
      await db.delete(bookingItems).where(eq(bookingItems.bookingId, id));
    }

    this.logger.log({ event: `booking.${to}`, bookingId: id, tenantId: user.tenantId });

    const auditEvent =
      to === 'confirmed'
        ? 'booking.confirmed'
        : to === 'cancelled'
          ? 'booking.cancelled'
          : to === 'checked_in'
            ? 'booking.checked_in'
            : 'booking.checked_out';

    void this.auditService.log(auditEvent, {
      actorUid: user.uid,
      entityType: 'booking',
      entityId: id,
      metadata: { tenantId: user.tenantId, previousStatus: booking.status },
    });

    return updated!;
  }
}
