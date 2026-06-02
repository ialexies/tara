import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { WaitlistService } from './waitlist.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

const JoinSchema = z.object({
  roomId: z.string().uuid(),
  propertyId: z.string().uuid(),
  guestEmail: z.string().email(),
  guestName: z.string().min(1).max(100),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  /** Public — guest joins waitlist */
  @Post()
  @HttpCode(201)
  @Throttle({ guest_action: {} })
  async join(@Body() body: unknown) {
    const result = JoinSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);
    const d = result.data;
    return this.svc.join(d.roomId, d.propertyId, d.guestEmail, d.guestName, d.checkIn, d.checkOut);
  }

  /** Owner — see waitlisted guests for their property */
  @Get('property/:propertyId')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async listForProperty(@Param('propertyId') propertyId: string, @CurrentUser() _user: AuthedUser) {
    return { data: await this.svc.listForProperty(propertyId) };
  }

  /** Owner — per-room waitlist counts for a property */
  @Get('property/:propertyId/counts')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async countsByRoom(@Param('propertyId') propertyId: string, @CurrentUser() _user: AuthedUser) {
    return { data: await this.svc.countsByRoom(propertyId) };
  }
}
