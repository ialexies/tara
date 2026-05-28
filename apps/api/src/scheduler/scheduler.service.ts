import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { db, bookings, properties, rooms } from '@tara/db';
import { eq, and, inArray } from 'drizzle-orm';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly email: EmailService) {}

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

      // Guest reminder
      void this.email.sendBookingReminder(ctx, row.guestEmail, false);

      this.logger.log({
        event: 'scheduler.reminder.sent',
        bookingId: row.bookingId,
        recipient: 'guest',
      });
    }
  }
}
