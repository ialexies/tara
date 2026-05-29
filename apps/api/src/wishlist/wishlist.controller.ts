import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { db, wishlists, users } from '@tara/db';
import { eq, and } from 'drizzle-orm';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';

@SkipThrottle({ global: true, auth: true, guest_action: true })
@Controller('wishlist')
@UseGuards(FirebaseGuard)
export class WishlistController {
  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, user.uid))
      .limit(1);
    if (!dbUser) return { data: [] };

    const rows = await db
      .select({ propertyId: wishlists.propertyId })
      .from(wishlists)
      .where(eq(wishlists.userId, dbUser.id));

    return { data: rows.map((r) => r.propertyId) };
  }

  @Post(':propertyId')
  @HttpCode(201)
  async add(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, user.uid))
      .limit(1);
    if (!dbUser) return { ok: false };

    await db.insert(wishlists).values({ userId: dbUser.id, propertyId }).onConflictDoNothing();
    return { ok: true };
  }

  @Delete(':propertyId')
  @HttpCode(204)
  async remove(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, user.uid))
      .limit(1);
    if (!dbUser) return;

    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, dbUser.id), eq(wishlists.propertyId, propertyId)));
  }
}
