import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { db, bookings, properties, rooms } from '@tara/db';
import { eq, and, inArray, lt } from 'drizzle-orm';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Runs daily at 08:00 PHT (UTC+8 = 00:00 UTC). */
  @Cron('0 0 * * *', { timeZone: 'Asia/Manila' })
  async sendBookingReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const rows = await db
      .select({
        bookingId: bookings.id,
        referenceCode: bookings.referenceCode,
        guestName: bookings.guestName,
        guestEmail: bookings.guestEmail,
        guestPhone: bookings.guestPhone,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        nights: bookings.nights,
        totalMinor: bookings.totalMinor,
        currency: bookings.currency,
        propertyId: bookings.propertyId,
        roomId: bookings.roomId,
        tenantId: bookings.tenantId,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.checkIn, tomorrowStr),
          inArray(bookings.status, ['confirmed', 'checked_in']),
        ),
      );

    if (rows.length === 0) return;

    this.logger.log({ event: 'scheduler.reminders.start', count: rows.length, date: tomorrowStr });

    const webUrl = process.env['WEB_URL'] ?? 'https://tara-stays.com';

    for (const row of rows) {
      const [prop] = await db
        .select({ name: properties.name, city: properties.city, ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, row.propertyId))
        .limit(1);

      const [room] = await db
        .select({ name: rooms.name })
        .from(rooms)
        .where(eq(rooms.id, row.roomId))
        .limit(1);

      if (!prop || !room) continue;

      const ctx = {
        guestName: row.guestName,
        guestEmail: row.guestEmail,
        referenceCode: row.referenceCode,
        propertyName: prop.name,
        propertyCity: prop.city,
        roomName: room.name,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        nights: row.nights,
        totalMinor: row.totalMinor,
        currency: row.currency,
        bookingUrl: `${webUrl}/en/bookings/${row.bookingId}`,
      };

      // Guest reminder — email + WhatsApp if phone on file
      void this.email.sendBookingReminder(ctx, row.guestEmail, false);
      if (row.guestPhone) {
        void this.whatsapp.sendBookingReminder({ ...ctx, guestPhone: row.guestPhone });
      }

      this.logger.log({
        event: 'scheduler.reminder.sent',
        bookingId: row.bookingId,
        recipient: 'guest',
      });
    }
  }

  /** Runs daily at 10:00 PHT — ask guests who checked out yesterday to leave a review. */
  @Cron('0 2 * * *', { timeZone: 'Asia/Manila' })
  async sendReviewPrompts() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const rows = await db
      .select({
        bookingId: bookings.id,
        guestName: bookings.guestName,
        guestEmail: bookings.guestEmail,
        guestPhone: bookings.guestPhone,
        propertyId: bookings.propertyId,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.checkOut, yesterdayStr),
          inArray(bookings.status, ['checked_out', 'confirmed']),
        ),
      );

    if (rows.length === 0) return;
    this.logger.log({
      event: 'scheduler.review_prompts.start',
      count: rows.length,
      date: yesterdayStr,
    });

    const webUrl = process.env['WEB_URL'] ?? 'https://tara-stays.com';

    for (const row of rows) {
      const [prop] = await db
        .select({ name: properties.name })
        .from(properties)
        .where(eq(properties.id, row.propertyId))
        .limit(1);
      if (!prop) continue;

      const reviewUrl = `${webUrl}/en/bookings/${row.bookingId}`;
      const ctx = { guestName: row.guestName, propertyName: prop.name, reviewUrl };

      void this.email.sendReviewPrompt({ ...ctx, guestEmail: row.guestEmail });
      if (row.guestPhone) {
        void this.whatsapp.sendReviewPrompt({ ...ctx, guestPhone: row.guestPhone });
      }
      this.logger.log({ event: 'scheduler.review_prompt.sent', bookingId: row.bookingId });
    }
  }

  /** Runs every hour — cancel manual_pending bookings older than 24h with no action. */
  @Cron('0 * * * *')
  async expireStaleBookings() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expired = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(bookings.status, 'manual_pending'), lt(bookings.createdAt, cutoff)))
      .returning({
        id: bookings.id,
        guestEmail: bookings.guestEmail,
        guestName: bookings.guestName,
        guestPhone: bookings.guestPhone,
        propertyId: bookings.propertyId,
        referenceCode: bookings.referenceCode,
      });

    if (expired.length === 0) return;
    this.logger.log({ event: 'scheduler.bookings.expired', count: expired.length });

    const webUrl = process.env['WEB_URL'] ?? 'https://tara-stays.com';
    for (const b of expired) {
      const [prop] = await db
        .select({ name: properties.name, city: properties.city })
        .from(properties)
        .where(eq(properties.id, b.propertyId))
        .limit(1);

      const ctx = {
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        referenceCode: b.referenceCode,
        propertyName: prop?.name ?? '',
        propertyCity: prop?.city ?? '',
        roomName: '',
        checkIn: '',
        checkOut: '',
        nights: 0,
        totalMinor: 0,
        currency: 'PHP',
        bookingUrl: `${webUrl}/en/bookings/${b.id}`,
      };
      void this.email.sendBookingCancelled(ctx);
      if (b.guestPhone) {
        void this.whatsapp.sendBookingCancelled({ ...ctx, guestPhone: b.guestPhone });
      }
    }
  }
}
