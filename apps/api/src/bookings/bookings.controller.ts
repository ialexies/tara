import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listByProperty(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const data = await this.svc.listByProperty(propertyId, user);
    return { data, meta: { count: data.length } };
  }

  /** Guest — list my own bookings (requires auth). */
  @Get('bookings/mine')
  @UseGuards(FirebaseGuard)
  async listMine(@CurrentUser() user: AuthedUser) {
    const data = await this.svc.listByGuest(user.uid);
    return { data, meta: { count: data.length } };
  }

  /** Public — create a booking (guest may or may not be logged in). */
  @Post('bookings')
  @HttpCode(201)
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
      return decoded.uid;
    } catch {
      return undefined;
    }
  }

  /** Public — fetch a booking by ID (UUID is unguessable; serves confirmation page). */
  @Get('bookings/:id')
  async getById(@Param('id') id: string) {
    return this.svc.getById(id);
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
}
