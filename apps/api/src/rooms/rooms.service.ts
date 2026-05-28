import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, properties, rooms, units, roomImages } from '@tara/db';
import { eq, and, isNull, asc, inArray } from 'drizzle-orm';
import type { CreateRoom, UpdateRoom } from '@tara/schemas';
import type { AuthedUser } from '../auth/firebase.guard.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  async listByProperty(propertyId: string, user: AuthedUser) {
    await this.assertPropertyOwned(propertyId, user);
    return db
      .select()
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), isNull(rooms.deletedAt)))
      .orderBy(rooms.position, rooms.createdAt);
  }

  async create(propertyId: string, input: CreateRoom, user: AuthedUser) {
    await this.assertPropertyOwned(propertyId, user);

    if (input.roomType === 'private' && input.capacity !== 1) {
      throw new BadRequestException('Private rooms must have capacity = 1');
    }

    if (input.bedLabels && input.bedLabels.length !== input.capacity) {
      throw new BadRequestException(
        `bedLabels length (${input.bedLabels.length}) must match capacity (${input.capacity})`,
      );
    }

    const slug = slugify(input.name);

    const [room] = await db
      .insert(rooms)
      .values({
        propertyId,
        tenantId: user.tenantId,
        name: input.name,
        slug,
        roomType: input.roomType,
        bathroomType: input.bathroomType ?? null,
        capacity: input.capacity,
        maxOccupancy: input.maxOccupancy ?? null,
        gender: input.gender ?? null,
        description: input.description ?? null,
        position: input.position,
        baseNightlyRateMinor: input.baseNightlyRateMinor,
        hasAircon: input.hasAircon,
        hasWindow: input.hasWindow,
        hasLocker: input.hasLocker,
        hasOutletPerBed: input.hasOutletPerBed,
      })
      .returning();

    // Auto-create units based on room type.
    const unitRows = this.buildUnits(room!, input);
    const createdUnits = await db.insert(units).values(unitRows).returning();

    this.logger.log({
      event: 'room.created',
      roomId: room!.id,
      propertyId,
      tenantId: user.tenantId,
      roomType: input.roomType,
      unitCount: createdUnits.length,
    });

    return { ...room!, units: createdUnits };
  }

  async update(propertyId: string, roomId: string, input: UpdateRoom, user: AuthedUser) {
    await this.assertPropertyOwned(propertyId, user);

    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId), isNull(rooms.deletedAt)))
      .limit(1);
    if (!room) throw new NotFoundException('Room not found');

    const [updated] = await db
      .update(rooms)
      .set({
        ...(input.name !== undefined && { name: input.name, slug: slugify(input.name) }),
        ...(input.baseNightlyRateMinor !== undefined && {
          baseNightlyRateMinor: input.baseNightlyRateMinor,
        }),
        ...(input.bathroomType !== undefined && { bathroomType: input.bathroomType }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.hasAircon !== undefined && { hasAircon: input.hasAircon }),
        ...(input.hasWindow !== undefined && { hasWindow: input.hasWindow }),
        ...(input.hasLocker !== undefined && { hasLocker: input.hasLocker }),
        ...(input.hasOutletPerBed !== undefined && { hasOutletPerBed: input.hasOutletPerBed }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, roomId))
      .returning();

    // Sync unit count when capacity changes (dorm rooms only)
    if (input.capacity !== undefined && updated?.roomType === 'dorm') {
      const existingUnits = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.roomId, roomId), isNull(units.deletedAt)));

      const existing = existingUnits.length;
      const target = input.capacity;

      if (target > existing) {
        const newUnits = Array.from({ length: target - existing }, (_, i) => ({
          roomId,
          tenantId: updated.tenantId,
          label: `Bed ${existing + i + 1}`,
          position: existing + i,
          isMock: false,
        }));
        await db.insert(units).values(newUnits);
      } else if (target < existing) {
        const toRemove = existingUnits.slice(target).map((u) => u.id);
        await db
          .update(units)
          .set({ isActive: false, deletedAt: new Date() })
          .where(inArray(units.id, toRemove));
      }
    }

    this.logger.log({ event: 'room.updated', roomId, propertyId, tenantId: user.tenantId });
    return updated!;
  }

  async remove(propertyId: string, roomId: string, user: AuthedUser) {
    await this.assertPropertyOwned(propertyId, user);

    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId), isNull(rooms.deletedAt)))
      .limit(1);
    if (!room) throw new NotFoundException('Room not found');

    await db
      .update(rooms)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(rooms.id, roomId));

    this.logger.log({ event: 'room.deleted', roomId, propertyId, tenantId: user.tenantId });
  }

  private buildUnits(room: { id: string; tenantId: string; isMock: boolean }, input: CreateRoom) {
    if (input.roomType === 'private') {
      return [
        {
          roomId: room.id,
          tenantId: room.tenantId,
          label: '(whole room)',
          position: 0,
          isMock: room.isMock,
        },
      ];
    }

    return Array.from({ length: input.capacity }, (_, i) => ({
      roomId: room.id,
      tenantId: room.tenantId,
      label: input.bedLabels?.[i] ?? `Bed ${i + 1}`,
      position: i,
      isMock: room.isMock,
    }));
  }

  async assertOwned(propertyId: string, roomId: string, user: AuthedUser) {
    await this.assertPropertyOwned(propertyId, user);
    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId), isNull(rooms.deletedAt)))
      .limit(1);
    if (!room) throw new NotFoundException('Room not found');
  }

  async listRoomImages(propertyId: string, roomId: string, user: AuthedUser) {
    await this.assertOwned(propertyId, roomId, user);
    return db
      .select()
      .from(roomImages)
      .where(eq(roomImages.roomId, roomId))
      .orderBy(asc(roomImages.position), asc(roomImages.createdAt));
  }

  async addRoomImage(propertyId: string, roomId: string, url: string, user: AuthedUser) {
    await this.assertOwned(propertyId, roomId, user);
    const existing = await db
      .select({ position: roomImages.position })
      .from(roomImages)
      .where(eq(roomImages.roomId, roomId))
      .orderBy(asc(roomImages.position));
    const nextPosition = existing.length > 0 ? existing[existing.length - 1]!.position + 1 : 0;
    const [image] = await db
      .insert(roomImages)
      .values({ roomId, tenantId: user.tenantId, url, position: nextPosition })
      .returning();
    return image!;
  }

  async deleteRoomImage(propertyId: string, roomId: string, imageId: string, user: AuthedUser) {
    await this.assertOwned(propertyId, roomId, user);
    const [img] = await db
      .select({ id: roomImages.id, roomId: roomImages.roomId })
      .from(roomImages)
      .where(eq(roomImages.id, imageId))
      .limit(1);
    if (!img || img.roomId !== roomId) throw new NotFoundException('Image not found');
    await db.delete(roomImages).where(eq(roomImages.id, imageId));
  }

  private async assertPropertyOwned(propertyId: string, user: AuthedUser) {
    const [prop] = await db
      .select({ id: properties.id, tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), isNull(properties.deletedAt)))
      .limit(1);

    if (!prop) throw new NotFoundException('Property not found');
    if (prop.tenantId !== user.tenantId) throw new ForbiddenException('Not your property');
  }
}
