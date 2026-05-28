import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, priceRules, properties } from '@tara/db';
import { eq, and, isNull } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class PriceRulesService {
  private readonly logger = new Logger(PriceRulesService.name);

  private async assertOwned(propertyId: string, user: AuthedUser) {
    const [prop] = await db
      .select({ id: properties.id, tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');
  }

  async listByProperty(propertyId: string, user: AuthedUser) {
    await this.assertOwned(propertyId, user);
    return db
      .select()
      .from(priceRules)
      .where(eq(priceRules.propertyId, propertyId))
      .orderBy(priceRules.startDate);
  }

  async create(
    propertyId: string,
    input: {
      name: string;
      roomId?: string | null;
      startDate: string;
      endDate: string;
      minNights?: number | null;
      rateOverrideMinor?: number | null;
    },
    user: AuthedUser,
  ) {
    await this.assertOwned(propertyId, user);
    const [rule] = await db
      .insert(priceRules)
      .values({
        propertyId,
        roomId: input.roomId ?? null,
        tenantId: user.tenantId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        minNights: input.minNights ?? null,
        rateOverrideMinor: input.rateOverrideMinor ?? null,
      })
      .returning();
    this.logger.log({ event: 'price_rule.created', ruleId: rule!.id, propertyId });
    return rule!;
  }

  async remove(propertyId: string, ruleId: string, user: AuthedUser) {
    await this.assertOwned(propertyId, user);
    const [rule] = await db
      .select({ id: priceRules.id })
      .from(priceRules)
      .where(and(eq(priceRules.id, ruleId), eq(priceRules.propertyId, propertyId)))
      .limit(1);
    if (!rule) throw new NotFoundException('Price rule not found');
    await db.delete(priceRules).where(eq(priceRules.id, ruleId));
    this.logger.log({ event: 'price_rule.deleted', ruleId, propertyId });
  }

  /** Returns rules that overlap a given date range (for availability checks). */
  async getApplicableRules(propertyId: string, checkIn: string, checkOut: string) {
    const all = await db.select().from(priceRules).where(eq(priceRules.propertyId, propertyId));

    return all.filter((r) => r.startDate <= checkOut && r.endDate >= checkIn);
  }
}
