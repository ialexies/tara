import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { BookingsService } from './bookings.service.js';
import { FirebaseGuard, type AuthedUser } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateBookingSchema } from '@tara/schemas';
import { getFirebaseAdmin } from '../auth/firebase-admin.js';

@Controller()
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  /** Public — dates where all units are fully booked (for calendar display). */
  @Get('properties/:propertyId/blocked-dates')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async blockedDates(
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.svc.getBlockedDates(propertyId, from, to);
    return { data };
  }

  /** Public — availability check for a property's rooms. */
  @Get('properties/:propertyId/availability')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async availability(
    @Param('propertyId') propertyId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const data = await this.svc.checkAvailability(propertyId, checkIn, checkOut);
    return { data };
  }

  /** Owner — list all bookings for a property. */
  @Get('properties/:propertyId/bookings')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listByProperty(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const data = await this.svc.listByProperty(propertyId, user);
    return { data, meta: { count: data.length } };
  }

  /** Guest — list my own bookings (requires auth). */
  @Get('bookings/mine')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard)
  async listMine(@CurrentUser() user: AuthedUser) {
    const data = await this.svc.listByGuest(user.uid);
    return { data, meta: { count: data.length } };
  }

  /** Public — create a booking (guest may or may not be logged in). */
  @Post('bookings')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  @Throttle({ guest_action: { limit: 5, ttl: 60_000 } })
  async create(@Body() body: unknown, @Req() req: FastifyRequest) {
    const input = CreateBookingSchema.parse(body);
    const guestUid = await this.extractOptionalUid(req);
    return this.svc.create(input, guestUid);
  }

  private async extractOptionalUid(req: FastifyRequest): Promise<string | undefined> {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return undefined;
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(auth.slice(7));
      // Enforce email verification for logged-in users
      if (!decoded.email_verified) {
        throw new Error('email_not_verified');
      }
      return decoded.uid;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'email_not_verified') {
        throw new (await import('@nestjs/common').then((m) => m.ForbiddenException))(
          'Please verify your email address before booking.',
        );
      }
      return undefined;
    }
  }

  /** Public — fetch a booking by ID (UUID is unguessable; serves confirmation page). */
  @Get('bookings/:id')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  /** Public — look up a booking by reference code (e.g. TARA-ABC123). */
  @Get('bookings/ref/:code')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async getByRef(@Param('code') code: string) {
    return this.svc.getByReferenceCode(code);
  }

  /** Owner — confirm a booking once payment is verified. */
  @Post('bookings/:id/confirm')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async confirm(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.confirm(id, user);
  }

  /** Owner — cancel a booking. */
  @Post('bookings/:id/cancel')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.cancel(id, user);
  }

  /** Owner — mark a booking as checked in. */
  @Post('bookings/:id/check-in')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async checkIn(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.checkIn(id, user);
  }

  /** Owner — mark a booking as checked out. */
  @Post('bookings/:id/check-out')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async checkOut(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.checkOut(id, user);
  }

  /** Owner — mark a booking's ID as verified. */
  @Post('bookings/:id/verify-id')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async verifyId(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.markIdVerified(id, user);
  }

  /** Guest — cancel their own booking (verified by email). */
  @Post('bookings/:id/cancel-guest')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ guest_action: { limit: 5, ttl: 60_000 } })
  async cancelByGuest(@Param('id') id: string, @Body() body: { guestEmail: string }) {
    return this.svc.cancelByGuest(id, body.guestEmail);
  }

  /** Guest — request a date change (verified by email). */
  @Post('bookings/:id/modification-requests')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  @Throttle({ guest_action: { limit: 5, ttl: 60_000 } })
  async requestDateChange(
    @Param('id') id: string,
    @Body()
    body: {
      requestedCheckIn: string;
      requestedCheckOut: string;
      guestEmail: string;
      guestMessage?: string;
    },
  ) {
    return this.svc.requestDateChange(
      id,
      body.requestedCheckIn,
      body.requestedCheckOut,
      body.guestEmail,
      body.guestMessage,
    );
  }

  /** Owner — list modification requests for a booking. */
  @Get('bookings/:id/modification-requests')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listModificationRequests(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    const data = await this.svc.listModificationRequests(id, user);
    return { data };
  }

  /** Owner — approve or reject a modification request. */
  @Post('bookings/:id/modification-requests/:requestId/resolve')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async resolveModificationRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() body: { action: 'approved' | 'rejected' },
    @CurrentUser() user: AuthedUser,
  ) {
    return this.svc.resolveModificationRequest(id, requestId, body.action, user);
  }

  /** Owner — list owner-blocked dates for a property. */
  @Get('properties/:propertyId/owner-blocks')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getOwnerBlocks(
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: AuthedUser,
  ) {
    const data = await this.svc.getOwnerBlocks(propertyId, from, to, user);
    return { data };
  }

  /** Owner — block a date. */
  @Post('properties/:propertyId/owner-blocks')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async setOwnerBlock(
    @Param('propertyId') propertyId: string,
    @Body() body: { date: string },
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.setOwnerBlock(propertyId, body.date, user);
    return { ok: true };
  }

  /** Owner — unblock a date. */
  @Delete('properties/:propertyId/owner-blocks/:date')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async deleteOwnerBlock(
    @Param('propertyId') propertyId: string,
    @Param('date') date: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.deleteOwnerBlock(propertyId, date, user);
    return { ok: true };
  }
}
