import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { GuestBlacklistService } from './guest-blacklist.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

const AddSchema = z.object({
  guestEmail: z.string().email(),
  reason: z.string().max(500).optional(),
});

@Controller('properties/:propertyId/blacklist')
@UseGuards(FirebaseGuard, RolesGuard)
@Roles('owner', 'admin')
export class GuestBlacklistController {
  constructor(private readonly svc: GuestBlacklistService) {}

  @Get()
  async list(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    return { data: await this.svc.listForProperty(propertyId, user) };
  }

  @Post()
  @HttpCode(201)
  async add(
    @Param('propertyId') propertyId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { guestEmail, reason } = AddSchema.parse(body);
    return this.svc.add(propertyId, guestEmail, reason, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.remove(propertyId, id, user);
  }
}
