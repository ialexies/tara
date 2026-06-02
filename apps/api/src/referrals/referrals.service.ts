import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { db } from '@tara/db/client';
import { referrals, users } from '@tara/db';
import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm';

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

    const normalizedEmail = referredEmail.toLowerCase();

    // Idempotent — ignore if this email was already tracked
    const [existing] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredEmail, normalizedEmail))
      .limit(1);

    if (existing) throw new ConflictException('Referral already recorded');

    await db.insert(referrals).values({
      referrerUid: referrer.firebaseUid,
      referredEmail: normalizedEmail,
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
    const result = await db
      .update(referrals)
      .set({ bookingId, discountApplied: true })
      .where(
        and(
          sql`lower(${referrals.referredEmail}) = lower(${referredEmail})`,
          isNull(referrals.bookingId),
        ),
      )
      .returning({ id: referrals.id });

    if (result.length > 0) {
      this.logger.log({ event: 'referral.converted', referredEmail, bookingId });
    }
  }
}
