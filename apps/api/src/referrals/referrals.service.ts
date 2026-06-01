import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { db } from '@tara/db/client';
import { referrals, users } from '@tara/db';
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  async track(referralCode: string, referredUid: string, referredEmail: string) {
    // Find the referrer by their code
    const [referrer] = await db
      .select({ firebaseUid: users.firebaseUid })
      .from(users)
      .where(eq(users.referralCode, referralCode.toUpperCase()))
      .limit(1);

    if (!referrer) throw new BadRequestException('Invalid referral code');
    if (referrer.firebaseUid === referredUid)
      throw new BadRequestException('Cannot refer yourself');

    // Idempotent — ignore if this email was already tracked
    const [existing] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredEmail, referredEmail))
      .limit(1);

    if (existing) throw new ConflictException('Referral already recorded');

    await db.insert(referrals).values({
      referrerUid: referrer.firebaseUid,
      referredEmail,
    });

    this.logger.log({
      event: 'referral.tracked',
      referrerUid: referrer.firebaseUid,
      referredEmail,
    });
    return { ok: true };
  }

  async getStats(referrerUid: string) {
    const [total] = await db
      .select({ c: count() })
      .from(referrals)
      .where(eq(referrals.referrerUid, referrerUid));

    const [converted] = await db
      .select({ c: count() })
      .from(referrals)
      .where(and(eq(referrals.referrerUid, referrerUid), isNotNull(referrals.bookingId)));

    return {
      referred: total?.c ?? 0,
      converted: converted?.c ?? 0,
    };
  }

  async markConversion(referredEmail: string, bookingId: string) {
    const [pending] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(and(eq(referrals.referredEmail, referredEmail), isNull(referrals.bookingId)))
      .limit(1);

    if (!pending) return;

    await db
      .update(referrals)
      .set({ bookingId, discountApplied: true })
      .where(eq(referrals.id, pending.id));

    this.logger.log({ event: 'referral.converted', referredEmail, bookingId });
  }
}
