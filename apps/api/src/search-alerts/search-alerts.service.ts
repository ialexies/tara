import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { db } from '@tara/db/client';
import { searchAlerts, properties } from '@tara/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class SearchAlertsService {
  constructor(private readonly email: EmailService) {}

  async save(
    guestEmail: string,
    filters: { city?: string; propertyType?: string; maxPriceMinor?: number; amenities?: string[] },
  ) {
    const [row] = await db
      .insert(searchAlerts)
      .values({
        guestEmail: guestEmail.toLowerCase(),
        city: filters.city ?? null,
        propertyType: filters.propertyType ?? null,
        maxPriceMinor: filters.maxPriceMinor ?? null,
        amenities: filters.amenities ?? null,
      })
      .returning();
    return row;
  }

  async listForEmail(guestEmail: string) {
    return db
      .select()
      .from(searchAlerts)
      .where(eq(searchAlerts.guestEmail, guestEmail.toLowerCase()));
  }

  async remove(id: string, guestEmail: string) {
    await db
      .delete(searchAlerts)
      .where(and(eq(searchAlerts.id, id), eq(searchAlerts.guestEmail, guestEmail.toLowerCase())));
  }

  /** Runs daily — sends alert emails when new matching properties go live */
  @Cron('0 8 * * *', { timeZone: 'Asia/Manila' })
  async sendAlerts() {
    const recentlyActive = await db
      .select({
        id: properties.id,
        name: properties.name,
        city: properties.city,
        propertyType: properties.propertyType,
      })
      .from(properties)
      .where(
        and(
          eq(properties.status, 'active'),
          isNull(properties.deletedAt),
          sql`${properties.createdAt} > now() - interval '25 hours'`,
        ),
      );

    if (recentlyActive.length === 0) return;

    const alerts = await db.select().from(searchAlerts);

    for (const alert of alerts) {
      const matches = recentlyActive.filter((p) => {
        if (alert.city && p.city?.toLowerCase() !== alert.city.toLowerCase()) return false;
        if (alert.propertyType && p.propertyType !== alert.propertyType) return false;
        return true;
      });
      if (matches.length === 0) continue;

      await this.email.sendSearchAlert(
        alert.guestEmail,
        matches.map((m) => m.name),
      );
      await db
        .update(searchAlerts)
        .set({ lastNotifiedAt: new Date() })
        .where(eq(searchAlerts.id, alert.id));
    }
  }
}
