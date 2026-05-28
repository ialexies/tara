import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { guestBlacklist } from '@tara/db';
import { and, eq } from 'drizzle-orm';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class GuestBlacklistService {
  async listForProperty(propertyId: string, user: AuthedUser) {
    return db
      .select()
      .from(guestBlacklist)
      .where(and(eq(guestBlacklist.propertyId, propertyId), eq(guestBlacklist.ownerUid, user.uid)));
  }

  async add(propertyId: string, guestEmail: string, reason: string | undefined, user: AuthedUser) {
    const [row] = await db
      .insert(guestBlacklist)
      .values({ propertyId, ownerUid: user.uid, guestEmail: guestEmail.toLowerCase(), reason })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async remove(propertyId: string, id: string, user: AuthedUser) {
    const [row] = await db
      .select()
      .from(guestBlacklist)
      .where(and(eq(guestBlacklist.id, id), eq(guestBlacklist.propertyId, propertyId)));
    if (!row) throw new NotFoundException();
    if (row.ownerUid !== user.uid) throw new ForbiddenException();
    await db.delete(guestBlacklist).where(eq(guestBlacklist.id, id));
  }

  async isBlocked(propertyId: string, guestEmail: string): Promise<boolean> {
    const [row] = await db
      .select({ id: guestBlacklist.id })
      .from(guestBlacklist)
      .where(
        and(
          eq(guestBlacklist.propertyId, propertyId),
          eq(guestBlacklist.guestEmail, guestEmail.toLowerCase()),
        ),
      );
    return !!row;
  }
}
