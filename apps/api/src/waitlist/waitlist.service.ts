import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { waitlist, rooms } from '@tara/db';
import { and, eq, isNull, lte, gte } from 'drizzle-orm';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);
  constructor(private readonly email: EmailService) {}

  async join(
    roomId: string,
    propertyId: string,
    guestEmail: string,
    guestName: string,
    checkIn: string,
    checkOut: string,
  ) {
    const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, roomId));
    if (!room) throw new NotFoundException('Room not found');

    const [row] = await db
      .insert(waitlist)
      .values({ roomId, propertyId, guestEmail, guestName, checkIn, checkOut })
      .onConflictDoNothing()
      .returning();
    return row ?? { alreadyJoined: true };
  }

  async listForProperty(propertyId: string) {
    return db.select().from(waitlist).where(eq(waitlist.propertyId, propertyId));
  }

  /** Called when a booking is cancelled — notify waitlisted guests for that room/dates */
  async notifyOnCancellation(roomId: string, checkIn: string, checkOut: string) {
    const entries = await db
      .select()
      .from(waitlist)
      .where(
        and(
          eq(waitlist.roomId, roomId),
          isNull(waitlist.notifiedAt),
          lte(waitlist.checkIn, checkOut),
          gte(waitlist.checkOut, checkIn),
        ),
      );

    const [room] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.id, roomId));

    for (const entry of entries) {
      try {
        await this.email.sendWaitlistAvailable(
          entry.guestEmail,
          entry.guestName,
          room?.name ?? 'room',
          checkIn,
          checkOut,
        );
        await db.update(waitlist).set({ notifiedAt: new Date() }).where(eq(waitlist.id, entry.id));
      } catch (err) {
        // Log and continue — a failure for one guest must not skip remaining entries
        this.logger.warn({
          event: 'waitlist.notify_failed',
          waitlistId: entry.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
