import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db, messages, bookings } from '@tara/db';
import { eq, and, asc, sql } from 'drizzle-orm';
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

  async getOwnerInbox(user: AuthedUser) {
    const rows = await db.execute(sql`
      SELECT
        b.id            AS booking_id,
        b.reference_code,
        b.guest_name,
        b.guest_email,
        b.check_in,
        b.check_out,
        b.status,
        p.id            AS property_id,
        p.name          AS property_name,
        lm.body         AS last_message_body,
        lm.created_at   AS last_message_at,
        lm.sender_name  AS last_sender_name,
        COUNT(m2.id) FILTER (
          WHERE m2.is_read = false AND m2.sender_uid != ${user.uid}
        )::int          AS unread_count
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN LATERAL (
        SELECT body, created_at, sender_name
        FROM messages
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN messages m2 ON m2.booking_id = b.id
      WHERE p.tenant_id = ${user.tenantId}
        AND p.deleted_at IS NULL
      GROUP BY b.id, p.id, p.name, lm.body, lm.created_at, lm.sender_name
      ORDER BY unread_count DESC, lm.created_at DESC
    `);

    return Array.from(rows) as unknown as {
      booking_id: string;
      reference_code: string;
      guest_name: string;
      guest_email: string;
      check_in: string;
      check_out: string;
      status: string;
      property_id: string;
      property_name: string;
      last_message_body: string;
      last_message_at: string;
      last_sender_name: string;
      unread_count: number;
    }[];
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
