import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { db, properties, rooms, propertyImages } from '@tara/db';
import { eq, and, isNull, count, min, getTableColumns, asc } from 'drizzle-orm';
import type { CreateProperty, UpdateProperty } from '@tara/schemas';
import type { AuthedUser } from '../auth/firebase.guard.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  async listActive() {
    const priceFromSq = db
      .select({
        propertyId: rooms.propertyId,
        priceFrom: min(rooms.baseNightlyRateMinor).as('priceFrom'),
      })
      .from(rooms)
      .where(and(eq(rooms.isActive, true), isNull(rooms.deletedAt)))
      .groupBy(rooms.propertyId)
      .as('price_from');

    return db
      .select({ ...getTableColumns(properties), priceFrom: priceFromSq.priceFrom })
      .from(properties)
      .leftJoin(priceFromSq, eq(properties.id, priceFromSq.propertyId))
      .where(and(eq(properties.status, 'active'), isNull(properties.deletedAt)))
      .orderBy(properties.publishedAt)
      .limit(100);
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
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({ event: 'property.updated', propertyId: id, tenantId: user.tenantId });
    return updated!;
  }

  async publish(id: string, user: AuthedUser) {
    const prop = await this.getOwnedById(id, user);

    if (prop.status === 'active') return prop;

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
      .set({ status: 'active', publishedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({
      event: 'property.published',
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
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');

    const [updated] = await db
      .update(properties)
      .set({ status, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

    this.logger.log({ event: 'admin.property.status_changed', propertyId: id, status });
    return updated!;
  }
}
