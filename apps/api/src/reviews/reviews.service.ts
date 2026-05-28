import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, reviews, bookings, properties } from '@tara/db';
import { eq, and, avg, count, desc } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  async listByProperty(propertyId: string) {
    return db
      .select()
      .from(reviews)
      .where(and(eq(reviews.propertyId, propertyId), eq(reviews.status, 'published')))
      .orderBy(reviews.createdAt);
  }

  async stats(propertyId: string) {
    const [row] = await db
      .select({ avg: avg(reviews.rating), count: count() })
      .from(reviews)
      .where(and(eq(reviews.propertyId, propertyId), eq(reviews.status, 'published')));
    return { avg: row?.avg ? Number(row.avg) : null, count: row?.count ?? 0 };
  }

  async create(input: { bookingId: string; rating: number; body?: string }, guestUid?: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');
    if (!['confirmed', 'checked_in', 'checked_out'].includes(booking.status)) {
      throw new BadRequestException('Can only review after booking is confirmed');
    }
    if (guestUid && booking.guestUid && booking.guestUid !== guestUid) {
      throw new ForbiddenException('Not your booking');
    }
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestException('Rating must be 1–5');
    }

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, input.bookingId))
      .limit(1);
    if (existing) throw new ConflictException('You have already reviewed this booking');

    const [review] = await db
      .insert(reviews)
      .values({
        propertyId: booking.propertyId,
        bookingId: input.bookingId,
        guestName: booking.guestName,
        guestUid: guestUid ?? null,
        rating: input.rating,
        body: input.body ?? null,
        status: 'published',
      })
      .returning();

    this.logger.log({
      event: 'review.created',
      reviewId: review!.id,
      propertyId: booking.propertyId,
    });
    return review!;
  }

  async listAll() {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(200);
  }

  async delete(id: string) {
    const [deleted] = await db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning({ id: reviews.id });
    if (!deleted) throw new NotFoundException('Review not found');
  }

  async replyToReview(id: string, reply: string, user: AuthedUser) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) throw new NotFoundException('Review not found');

    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(eq(properties.id, review.propertyId))
      .limit(1);
    if (!prop || prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    const [updated] = await db
      .update(reviews)
      .set({ ownerReply: reply, ownerRepliedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();

    this.logger.log({ event: 'review.reply_added', reviewId: id, propertyId: review.propertyId });
    return updated!;
  }

  async approve(id: string, user: AuthedUser) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) throw new NotFoundException('Review not found');

    const [prop] = await db
      .select({ tenantId: properties.tenantId })
      .from(properties)
      .where(eq(properties.id, review.propertyId))
      .limit(1);
    if (!prop || prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');

    const [updated] = await db
      .update(reviews)
      .set({ status: 'published' })
      .where(eq(reviews.id, id))
      .returning();
    return updated!;
  }
}
