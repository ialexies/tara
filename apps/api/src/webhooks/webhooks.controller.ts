import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

const ALLOWED_EVENTS = [
  'booking.created',
  'booking.confirmed',
  'booking.cancelled',
  'booking.checked_in',
  'booking.checked_out',
];

const CreateSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(ALLOWED_EVENTS as [string, ...string[]])).default(ALLOWED_EVENTS),
});

@Controller('webhooks')
@UseGuards(FirebaseGuard, RolesGuard)
@Roles('owner', 'admin')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    return { data: await this.svc.listForOwner(user) };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const { url, events } = CreateSchema.parse(body);
    return this.svc.create(url, events, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    await this.svc.remove(id, user);
  }
}
