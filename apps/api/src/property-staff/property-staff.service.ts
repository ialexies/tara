import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { propertyStaff, properties } from '@tara/db';
import { and, eq } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class PropertyStaffService {
  async listForProperty(propertyId: string, user: AuthedUser) {
    await this.assertOwner(propertyId, user);
    return db.select().from(propertyStaff).where(eq(propertyStaff.propertyId, propertyId));
  }

  async invite(propertyId: string, staffEmail: string, role: string, user: AuthedUser) {
    await this.assertOwner(propertyId, user);
    const [row] = await db
      .insert(propertyStaff)
      .values({ propertyId, ownerUid: user.uid, staffEmail: staffEmail.toLowerCase(), role })
      .onConflictDoNothing()
      .returning();
    return row ?? { alreadyInvited: true };
  }

  async remove(propertyId: string, id: string, user: AuthedUser) {
    await this.assertOwner(propertyId, user);
    await db
      .delete(propertyStaff)
      .where(and(eq(propertyStaff.id, id), eq(propertyStaff.propertyId, propertyId)));
  }

  /** Check if a given uid is staff on a property */
  async isStaff(propertyId: string, uid: string): Promise<boolean> {
    const [row] = await db
      .select({ id: propertyStaff.id })
      .from(propertyStaff)
      .where(and(eq(propertyStaff.propertyId, propertyId), eq(propertyStaff.staffUid, uid)));
    return !!row;
  }

  private async assertOwner(propertyId: string, user: AuthedUser) {
    const [prop] = await db
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    if (!prop) throw new NotFoundException('Property not found');
    if (prop.ownerId !== user.uid && user.role !== 'admin') throw new ForbiddenException();
  }
}
