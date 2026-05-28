import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db, messages, bookings } from '@tara/db';
import { eq, and, asc } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  private async assertBookingAccess(bookingId: string, user: AuthedUser) {
    const [booking] = await db
      .select({
        guestUid: bookings.guestUid,
        propertyId: bookings.propertyId,
        tenantId: bookings.tenantId,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');

    const isGuest = booking.guestUid === user.uid;
    const isOwner =
      booking.tenantId === user.tenantId && (user.role === 'owner' || user.role === 'admin');
    if (!isGuest && !isOwner) throw new ForbiddenException('Access denied');

    return booking;
  }

  async listForBooking(bookingId: string, user: AuthedUser) {
    await this.assertBookingAccess(bookingId, user);

    // Mark unread messages from the other party as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.bookingId, bookingId), eq(messages.isRead, false)));

    return db
      .select()
      .from(messages)
      .where(eq(messages.bookingId, bookingId))
      .orderBy(asc(messages.createdAt));
  }

  async send(bookingId: string, user: AuthedUser, body: string, senderName: string) {
    await this.assertBookingAccess(bookingId, user);

    const [msg] = await db
      .insert(messages)
      .values({ bookingId, senderUid: user.uid, senderName, body })
      .returning();

    this.logger.log({ event: 'message.sent', bookingId, senderUid: user.uid });
    return msg!;
  }

  async unreadCount(bookingIds: string[]): Promise<Map<string, number>> {
    if (bookingIds.length === 0) return new Map();
    const rows = await db
      .select({ bookingId: messages.bookingId })
      .from(messages)
      .where(and(eq(messages.isRead, false)));
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (bookingIds.includes(r.bookingId)) {
        counts.set(r.bookingId, (counts.get(r.bookingId) ?? 0) + 1);
      }
    }
    return counts;
  }
}
