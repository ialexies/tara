import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, promoCodes } from '@tara/db';
import { eq, and, sql, isNull, or } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

export const CreatePromoCodeSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().min(1).max(100_000),
  maxUses: z.number().int().min(1).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  propertyId: z.string().uuid().optional(),
});

@Injectable()
export class PromoCodesService {
  async listForOwner(user: AuthedUser) {
    return db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.createdByUid, user.uid))
      .orderBy(promoCodes.createdAt);
  }

  async create(input: z.infer<typeof CreatePromoCodeSchema>, user: AuthedUser) {
    const [created] = await db
      .insert(promoCodes)
      .values({
        ...input,
        code: input.code.toUpperCase(),
        createdByUid: user.uid,
      })
      .returning();
    return created!;
  }

  async deactivate(id: string, user: AuthedUser) {
    const [updated] = await db
      .update(promoCodes)
      .set({ isActive: false })
      .where(and(eq(promoCodes.id, id), eq(promoCodes.createdByUid, user.uid)))
      .returning({ id: promoCodes.id });
    if (!updated) throw new NotFoundException('Promo code not found');
    return { ok: true };
  }

  /** Validate a promo code and return the discount for a given property + amount. */
  async validate(code: string, propertyId: string, amountMinor: number) {
    const today = new Date().toISOString().slice(0, 10);
    const [row] = await db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(sql`LOWER(${promoCodes.code})`, code.toLowerCase()),
          eq(promoCodes.isActive, true),
          or(isNull(promoCodes.propertyId), eq(promoCodes.propertyId, propertyId)),
          or(isNull(promoCodes.validFrom), sql`${promoCodes.validFrom} <= ${today}`),
          or(isNull(promoCodes.validTo), sql`${promoCodes.validTo} >= ${today}`),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Invalid or expired promo code');
    if (row.maxUses != null && row.usesCount >= row.maxUses) {
      throw new BadRequestException('This promo code has reached its usage limit');
    }

    const discountMinor =
      row.discountType === 'percent'
        ? Math.round(amountMinor * (row.discountValue / 100))
        : Math.min(row.discountValue, amountMinor);

    return {
      id: row.id,
      code: row.code,
      discountType: row.discountType,
      discountValue: row.discountValue,
      discountMinor,
      finalAmountMinor: amountMinor - discountMinor,
    };
  }

  async incrementUses(id: string) {
    await db
      .update(promoCodes)
      .set({ usesCount: sql`${promoCodes.usesCount} + 1` })
      .where(eq(promoCodes.id, id));
  }
}
