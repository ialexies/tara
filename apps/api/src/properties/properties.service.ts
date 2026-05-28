import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import {
  db,
  properties,
  rooms,
  units,
  bookingItems,
  bookings,
  propertyImages,
  ownerBlocks,
  users,
} from '@tara/db';
import {
  eq,
  and,
  isNull,
  count,
  sum,
  min,
  sql,
  getTableColumns,
  asc,
  inArray,
  notExists,
} from 'drizzle-orm';
import type { CreateProperty, UpdateProperty } from '@tara/schemas';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { EmailService } from '../email/email.service.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private readonly email: EmailService) {}

  async listActive(filters?: {
    amenities?: string[];
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    propertyType?: string;
  }) {
    const priceFromSq = db
      .select({
        propertyId: rooms.propertyId,
        priceFrom: min(rooms.baseNightlyRateMinor).as('priceFrom'),
      })
      .from(rooms)
      .where(and(eq(rooms.isActive, true), isNull(rooms.deletedAt)))
      .groupBy(rooms.propertyId)
      .as('price_from');

    const rows = await db
      .select({ ...getTableColumns(properties), priceFrom: priceFromSq.priceFrom })
      .from(properties)
      .leftJoin(priceFromSq, eq(properties.id, priceFromSq.propertyId))
      .where(and(eq(properties.status, 'active'), isNull(properties.deletedAt)))
      .orderBy(properties.publishedAt)
      .limit(200);

    if (!filters) return rows;

    return rows.filter((p) => {
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.propertyType && p.propertyType !== filters.propertyType) return false;
      if (filters.minPrice != null && p.priceFrom != null && p.priceFrom < filters.minPrice)
        return false;
      if (filters.maxPrice != null && p.priceFrom != null && p.priceFrom > filters.maxPrice)
        return false;
      if (filters.amenities && filters.amenities.length > 0) {
        const a = (p.amenities ?? {}) as Record<string, boolean>;
        if (!filters.amenities.every((k) => a[k] === true)) return false;
      }
      return true;
    });
  }

  async listActiveWithAvailability(
    checkIn: string,
    checkOut: string,
    filters?: {
      amenities?: string[];
      minPrice?: number;
      maxPrice?: number;
      city?: string;
      propertyType?: string;
    },
  ) {
    if (checkOut <= checkIn) return [];

    // Build the list of nights between checkIn and checkOut
    const nights: string[] = [];
    const cursor = new Date(checkIn);
    const end = new Date(checkOut);
    while (cursor < end) {
      nights.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (nights.length === 0) return [];

    // Get all active properties first
    const allActive = await this.listActive(filters);
    if (allActive.length === 0) return [];

    // For each property check if any unit is fully free for all nights
    const available: typeof allActive = [];
    await Promise.all(
      allActive.map(async (prop) => {
        // Any unit in this property that has no booking for any of the nights
        const [freeUnit] = await db
          .select({ id: units.id })
          .from(units)
          .innerJoin(rooms, eq(units.roomId, rooms.id))
          .where(
            and(
              eq(rooms.propertyId, prop.id),
              eq(rooms.isActive, true),
              isNull(rooms.deletedAt),
              eq(units.isActive, true),
              isNull(units.deletedAt),
              notExists(
                db
                  .select({ id: bookingItems.id })
                  .from(bookingItems)
                  .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
                  .where(
                    and(
                      eq(bookingItems.unitId, units.id),
                      inArray(bookingItems.night, nights),
                      inArray(bookings.status, [
                        'stripe_pending',
                        'manual_pending',
                        'awaiting_verification',
                        'confirmed',
                        'checked_in',
                      ]),
                    ),
                  ),
              ),
              notExists(
                db
                  .select({ date: ownerBlocks.date })
                  .from(ownerBlocks)
                  .where(
                    and(eq(ownerBlocks.propertyId, prop.id), inArray(ownerBlocks.date, nights)),
                  ),
              ),
            ),
          )
          .limit(1);

        if (freeUnit) available.push(prop);
      }),
    );

    return available;
  }

  async getBySlug(slug: string) {
    const [prop] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.slug, slug),
          eq(properties.status, 'active'),
          isNull(properties.deletedAt),
        ),
      )
      .limit(1);

    if (!prop) throw new NotFoundException('Property not found');

    const propRooms = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.propertyId, prop.id), eq(rooms.isActive, true), isNull(rooms.deletedAt)))
      .orderBy(rooms.position, rooms.createdAt);

    return { ...prop, rooms: propRooms };
  }

  async listByOwner(user: AuthedUser) {
    return db
      .select()
      .from(properties)
      .where(and(eq(properties.tenantId, user.tenantId), isNull(properties.deletedAt)))
      .orderBy(properties.createdAt);
  }

  async getOwnedById(id: string, user: AuthedUser) {
    const [row] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, id),
          eq(properties.tenantId, user.tenantId),
          isNull(properties.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Property not found');
    return row;
  }

  async create(input: CreateProperty, user: AuthedUser) {
    const baseSlug = slugify(input.name);

    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const [existing] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const [created] = await db
      .insert(properties)
      .values({
        tenantId: user.tenantId,
        ownerId: user.tenantId,
        name: input.name,
        slug,
        propertyType: input.propertyType,
        region: input.region,
        city: input.city,
        addressLine: input.addressLine ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        paymentMode: input.paymentMode,
        manualPaymentMethods: input.manualPaymentMethods ?? null,
        status: 'draft',
      })
      .returning();

    this.logger.log({
      event: 'property.created',
      propertyId: created!.id,
      ownerId: user.uid,
      tenantId: user.tenantId,
    });

    return created!;
  }

  async update(id: string, input: UpdateProperty, user: AuthedUser) {
    await this.getOwnedById(id, user);

    if (input.slug !== undefined) {
      const [existing] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.slug, input.slug))
        .limit(1);
      if (existing && existing.id !== id) {
        throw new ConflictException('That slug is already in use');
      }
    }

    const [updated] = await db
      .update(properties)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.propertyType !== undefined && { propertyType: input.propertyType }),
        ...(input.region !== undefined && { region: input.region }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.addressLine !== undefined && { addressLine: input.addressLine }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.paymentMode !== undefined && { paymentMode: input.paymentMode }),
        ...(input.manualPaymentMethods !== undefined && {
          manualPaymentMethods: input.manualPaymentMethods,
        }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
        ...(input.amenities !== undefined && { amenities: input.amenities }),
        ...(input.checkInTime !== undefined && { checkInTime: input.checkInTime }),
        ...(input.checkOutTime !== undefined && { checkOutTime: input.checkOutTime }),
        ...(input.houseRules !== undefined && { houseRules: input.houseRules }),
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({ event: 'property.updated', propertyId: id, tenantId: user.tenantId });
    return updated!;
  }

  async publish(id: string, user: AuthedUser) {
    const prop = await this.getOwnedById(id, user);

    if (prop.status === 'active' || prop.status === 'pending') return prop;

    const [result] = await db
      .select({ roomCount: count() })
      .from(rooms)
      .where(and(eq(rooms.propertyId, id), eq(rooms.isActive, true), isNull(rooms.deletedAt)));

    if ((result?.roomCount ?? 0) === 0) {
      throw new UnprocessableEntityException(
        'Add at least one room before publishing this property',
      );
    }

    const [updated] = await db
      .update(properties)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({
      event: 'property.submitted_for_review',
      propertyId: id,
      ownerId: user.uid,
      tenantId: user.tenantId,
    });

    return updated!;
  }

  async unpublish(id: string, user: AuthedUser) {
    await this.getOwnedById(id, user);

    const [updated] = await db
      .update(properties)
      .set({ status: 'draft' })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({
      event: 'property.unpublished',
      propertyId: id,
      ownerId: user.uid,
      tenantId: user.tenantId,
    });

    return updated!;
  }

  async count(): Promise<number> {
    const rows = await db.select().from(properties);
    return rows.length;
  }

  async listPropertyImages(propertyId: string) {
    return db
      .select()
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, propertyId))
      .orderBy(asc(propertyImages.position), asc(propertyImages.createdAt));
  }

  async addPropertyImage(propertyId: string, url: string, user: AuthedUser) {
    await this.getOwnedById(propertyId, user);
    const existing = await db
      .select({ position: propertyImages.position })
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, propertyId))
      .orderBy(asc(propertyImages.position));
    const nextPosition = existing.length > 0 ? existing[existing.length - 1]!.position + 1 : 0;
    const [image] = await db
      .insert(propertyImages)
      .values({ propertyId, tenantId: user.tenantId, url, position: nextPosition })
      .returning();
    return image!;
  }

  async deletePropertyImage(propertyId: string, imageId: string, user: AuthedUser) {
    await this.getOwnedById(propertyId, user);
    const [img] = await db
      .select({ id: propertyImages.id, propertyId: propertyImages.propertyId })
      .from(propertyImages)
      .where(eq(propertyImages.id, imageId))
      .limit(1);
    if (!img || img.propertyId !== propertyId) throw new NotFoundException('Image not found');
    await db.delete(propertyImages).where(eq(propertyImages.id, imageId));
  }

  async getOccupancyReport(propertyId: string, user: AuthedUser, months = 3) {
    await this.getOwnedById(propertyId, user);

    // Total units in this property
    const [totals] = await db
      .select({ unitCount: count(units.id) })
      .from(units)
      .innerJoin(rooms, eq(units.roomId, rooms.id))
      .where(
        and(
          eq(rooms.propertyId, propertyId),
          eq(rooms.isActive, true),
          eq(units.isActive, true),
          isNull(rooms.deletedAt),
          isNull(units.deletedAt),
        ),
      );

    const totalUnits = totals?.unitCount ?? 0;

    // Build month buckets
    const result: {
      month: string;
      soldNights: number;
      totalNights: number;
      occupancyPct: number;
    }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

      const [sold] = await db
        .select({ nights: count(bookingItems.night) })
        .from(bookingItems)
        .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
        .innerJoin(units, eq(bookingItems.unitId, units.id))
        .innerJoin(rooms, eq(units.roomId, rooms.id))
        .where(
          and(
            eq(rooms.propertyId, propertyId),
            inArray(bookings.status, ['confirmed', 'checked_in', 'checked_out']),
            sql`${bookingItems.night} >= ${firstDay}`,
            sql`${bookingItems.night} <= ${lastDay}`,
          ),
        );

      const soldNights = sold?.nights ?? 0;
      const totalNights = totalUnits * daysInMonth;
      result.push({
        month: label,
        soldNights,
        totalNights,
        occupancyPct: totalNights > 0 ? Math.round((soldNights / totalNights) * 100) : 0,
      });
    }

    return result;
  }

  async getRevenueSummary(user: AuthedUser) {
    const owned = await db
      .select({ id: properties.id, name: properties.name, currency: properties.currency })
      .from(properties)
      .where(and(eq(properties.tenantId, user.tenantId), isNull(properties.deletedAt)));

    if (owned.length === 0) return [];

    const propertyIds = owned.map((p) => p.id);
    const rows = await db
      .select({
        propertyId: bookings.propertyId,
        total: sum(bookings.totalMinor).as('total'),
        count: count().as('count'),
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.propertyId, propertyIds),
          inArray(bookings.status, ['confirmed', 'checked_in', 'checked_out']),
        ),
      )
      .groupBy(bookings.propertyId);

    const revenueMap = new Map(rows.map((r) => [r.propertyId, r]));

    return owned.map((p) => {
      const rev = revenueMap.get(p.id);
      return {
        propertyId: p.id,
        propertyName: p.name,
        currency: p.currency,
        totalMinor: rev?.total ? parseInt(String(rev.total)) : 0,
        bookingCount: rev?.count ?? 0,
      };
    });
  }

  async adminListAll() {
    return db
      .select({
        id: properties.id,
        name: properties.name,
        slug: properties.slug,
        city: properties.city,
        region: properties.region,
        propertyType: properties.propertyType,
        status: properties.status,
        tenantId: properties.tenantId,
        createdAt: properties.createdAt,
      })
      .from(properties)
      .orderBy(properties.createdAt);
  }

  async adminSetStatus(id: string, status: 'active' | 'suspended' | 'paused' | 'pending') {
    const [prop] = await db
      .select({
        id: properties.id,
        name: properties.name,
        slug: properties.slug,
        ownerId: properties.ownerId,
        previousStatus: properties.status,
      })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');

    const [updated] = await db
      .update(properties)
      .set({
        status,
        publishedAt:
          status === 'active' && prop.previousStatus !== 'active' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({ event: 'admin.property.status_changed', propertyId: id, status });

    // Notify owner by email when transitioning to active or suspended
    if (status === 'active' || status === 'suspended') {
      const [owner] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.firebaseUid, prop.ownerId))
        .limit(1);
      if (owner?.email) {
        const webUrl = process.env['WEB_URL'] ?? 'https://tara-stays.com';
        if (status === 'active') {
          void this.email.sendPropertyApproved(
            owner.email,
            prop.name,
            `${webUrl}/en/properties/${prop.slug}`,
          );
        } else {
          void this.email.sendPropertyRejected(owner.email, prop.name);
        }
      }
    }

    return updated!;
  }
}
